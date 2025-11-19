import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { storage } from '../storage';
import jwt from 'jsonwebtoken';
import { Email, User } from '@shared/schema';

/**
 * EmailService encapsulates creation and sending of different kinds of
 * transactional emails used across the app (password reset, account
 * creation, notifications). It centralizes transporter initialization
 * and activity recording in storage.
 */
class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private envTransporter: nodemailer.Transporter | null = null;

  /**
   * Initialize the SMTP transporter using a user's stored email config.
   * @param userId - id of the user that owns the email configuration
   */
  async initializeTransporter(userId: number) {
    const config = await storage.getEmailConfigurationByUserId(userId);
    if (!config) {
      throw new Error('Email configuration not found');
    }

    this.transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      auth: {
        user: config.username,
        pass: config.password,
      },
    });
  }

  /**
   * Create a transporter from a generic config object. Useful for
   * one-off sends (e.g. sendUserEmail) without mutating the instance
   * transporter.
   */
  private createTransporterFromConfig(config: any) {
    return nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      auth: {
        user: config.username,
        pass: config.password,
      },
    });
  }

  /**
   * Cached transporter built from environment SMTP settings.
   * Reusing this avoids recreating connections for env-based messages.
   */
  private getEnvTransporter() {
    if (this.envTransporter) return this.envTransporter;

    this.envTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL,
        pass: process.env.SMTP_PASS || process.env.PASSWORD,
      },
    });

    return this.envTransporter;
  }

  /**
   * Send a generic email record. Expects `email.userId` to exist so the
   * appropriate transporter can be initialized.
   * Records send status and creates an activity entry on success.
   */
  async sendEmail(email: Email, user?: any) {
    try {
      if (!email.userId) {
        throw new Error('User ID required for sending email');
      }

      await this.initializeTransporter(email.userId);

      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      const mailOptions = {
        from: email.fromEmail,
        to: email.toEmail,
        cc: email.ccEmail || undefined,
        bcc: email.bccEmail || undefined,
        subject: email.subject,
        text: email.isHtml ? undefined : email.body,
        html: email.isHtml ? email.body : undefined,
      };

      const result = await this.transporter.sendMail(mailOptions);

      await storage.updateEmail(email.id, {
        status: 'sent',
        sentAt: new Date(),
      });

      await storage.createActivity({
        type: 'email_sent',
        description: `Email sent to ${email.toEmail}`,
        entityType: 'email',
        entityId: email.id,
        userId: email.userId,
      });

      return result;
    } catch (error) {
      console.error('Failed to send email:', error);
      await storage.updateEmail(email.id, {
        status: 'failed',
      });

      throw error;
    }
  }

  /**
   * Send an HTML email on behalf of a specific user using that user's
   * configured SMTP credentials.
   */
  async sendUserEmail(email: Email, user: any) {
    try {
      const User = await storage.getUserByUsername(user?.username);
      if (!User) {
        throw new Error('User not found');
      }
      const userEmailConfig = await storage.getEmailConfigurationByUserId(User.id);
      if (!userEmailConfig) {
        throw new Error('Failed to get user email configuration');
      }
      const transporter = this.createTransporterFromConfig(userEmailConfig);
      const mailOptions = {
        from: userEmailConfig.username,
        to: email.toEmail,
        cc: email.ccEmail || undefined,
        bcc: email.bccEmail || undefined,
        subject: email.subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1E40AF;">From Integriti CRM</h2>
            <p>HI this is mail is from ${user.firstName} ${user.lastName}</p>
            <p style="font-size: 18px; font-weight: bold; color: #1E40AF;">${email.body}</p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      return { success: true, message: 'New password sent via email' };
    } catch (error) {
      console.error('Failed to reset and send new password:', error);
      throw error;
    }
  }

  /**
   * Send a password reset email containing a short-lived JWT token.
   * The frontend should provide a `/reset-password` route that accepts
   * this token and allows the user to set a new password.
   */
  async sendPasswordResetEmail(user: User) {
    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new Error("JWT_SECRET is not defined in .env file.");
      }

      // 1. Create a short-lived (10 minutes) token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        jwtSecret,
        { expiresIn: '10m' }
      );

      // 2. Create the reset link for the frontend
      const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

      // 3. Create the email transporter
      const transporter = this.getEnvTransporter();

      // 4. Create the email content
      const mailOptions = {
        from: `"No-Reply" <${process.env.SMTP_USER || process.env.EMAIL}>`,
        to: user.email,
        subject: 'Reset Your Password',
        html: `...`,
      };

      // 5. Send the email
      await transporter.sendMail(mailOptions);
      return { success: true, message: 'Password reset link sent via email' };

    } catch (error) {
      console.error('Failed to send password reset link:', error);
      throw error;
    }
  }

  /**
   * Send an initial account creation email containing credentials.
   */
  async sendCreateUserEmail(email: string, password: string, username: string) {
    try {
      const user = await storage.getUserByEmail(email);
      if (!user) {
        throw new Error('User not found');
      }

      const transporter = this.getEnvTransporter();

      const mailOptions = {
        from: `"No-Reply" <${process.env.SMTP_USER || process.env.EMAIL}>`,
        to: email,
        subject: 'Your Account Credentials',
        html: `...`,
      };

      await transporter.sendMail(mailOptions);
      return { success: true, message: 'New account credentials sent via email' };
    } catch (error) {
      console.error('Failed to send new credentials:', error);
      throw error;
    }
  }

  /**
   * Send an email notifying a user their password/account was updated.
   */
  async sendUpdateUserPasswordEmail(user: any) {
    try {
      const transporter = this.getEnvTransporter();
      
      const updatedAtFormatted = user.updatedAt 
        ? new Date(user.updatedAt).toLocaleString() 
        : 'N/A';

      const mailOptions = {
        from: `"No-Reply" <${process.env.SMTP_USER || process.env.EMAIL}>`,
        to: user.email,
        subject: 'Your Account Credentials',
        html: `...`,
      };

      await transporter.sendMail(mailOptions);
      return { success: true, message: 'New account credentials sent via email' };
    } catch (error) {
      console.error('Failed to send new credentials:', error);
      throw error;
    }
  }

  /**
   * Verify the provided SMTP configuration can be used to send mail.
   */
  async testEmailConfiguration(config: any) {
    try {
      const transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpPort === 465,
        auth: {
          user: config.username,
          pass: config.password,
        },
      });

      await transporter.verify();
      return { success: true, message: 'Email configuration is valid' };
    } catch (error) {
      console.error('Email configuration test failed:', error);
      return { success: false, message: 'Email configuration is invalid' };
    }
  }

  /**
   * Schedule an email to be sent at `email.scheduledAt` if provided.
   */
  async scheduleEmail(email: Email) {
    if (email.scheduledAt) {
      const delay = new Date(email.scheduledAt).getTime() - Date.now();
      if (delay > 0) {
        setTimeout(async () => {
          await this.sendEmail(email);
        }, delay);
      }
    }
  }
}

export const emailService = new EmailService();
