import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { storage } from '../storage';
import jwt from 'jsonwebtoken';
import { Email, User } from '@shared/schema';

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

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
      const transporter = nodemailer.createTransport({
        host: userEmailConfig.smtpHost,
        port: userEmailConfig.smtpPort,
        secure: false,
        auth: {
          user: userEmailConfig.username,
          pass: userEmailConfig.password,
        },
      });
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

  async sendPasswordResetEmail(user: User) {
    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new Error("JWT_SECRET is not defined in .env file.");
      }

      // 1. Create a short-lived (1 hour) token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        jwtSecret,
        { expiresIn: '10m' }
      );

      // 2. Create the reset link for your frontend
      //    You must create this page in your React app
      const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

      // 3. Create the email transporter
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER || process.env.EMAIL,
          pass: process.env.SMTP_PASS || process.env.PASSWORD,
        },
      });

      // 4. Create the email content
      const mailOptions = {
        from: `"No-Reply" <${process.env.SMTP_USER || process.env.EMAIL}>`,
        to: user.email,
        subject: 'Reset Your Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #f9f9f9; padding: 20px; text-align: center;">
              <img src="https://storage.googleapis.com/crmlogs/crm_assets/Logo.png" alt="Company Logo" style="max-width: 150px;">
            </div>
            <div style="padding: 24px; color: #333;">
              <h2 style="color: #1E40AF; margin-top: 0;">Password Reset Request</h2>
              <p>Hi ${user.firstName || user.username},</p>
              <p style="font-size: 16px; line-height: 1.5;">We received a request to reset your password. Click the button below to set a new password:</p>
              
              <p style="margin-top: 24px; text-align: center;">
                <a href="${resetLink}" style="background-color: #1E40AF; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Set New Password
                </a>
              </p>
              
              <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                This link will expire in 1 hour. If you did not request a password reset, please ignore this email.
              </p>
            </div>
          </div>
        `,
      };

      // 5. Send the email
      await transporter.sendMail(mailOptions);
      return { success: true, message: 'Password reset link sent via email' };

    } catch (error) {
      console.error('Failed to send password reset link:', error);
      throw error;
    }
  }


async sendCreateUserEmail(email: string, password: string, username: string) {
  try {
    const user = await storage.getUserByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL,
        pass: process.env.SMTP_PASS || process.env.PASSWORD,
      },
    });

    const mailOptions = {
      from: `"No-Reply" <${process.env.SMTP_USER || process.env.EMAIL}>`,
      to: email,
      subject: 'Your Account Credentials',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #1E40AF; text-align: center;">Welcome, ${username}!</h2>
          
          <p>We’ve created an account for you. Please find your login details below:</p>

          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 16px;"><strong>Username:</strong> ${username}</p>
            <p style="margin: 5px 0 0; font-size: 16px;"><strong>Password:</strong> 
              <span style="color: #1E40AF; font-weight: bold;">${password}</span>
            </p>
          </div>

          <p>For security reasons, we strongly recommend that you log in and change your password immediately.</p>

          <p style="font-size: 14px; color: #6b7280; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 10px;">
            This is an automated email. Please do not reply. If you did not request this, please contact support.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return { success: true, message: 'New account credentials sent via email' };
  } catch (error) {
    console.error('Failed to send new credentials:', error);
    throw error;
  }
}

async sendUpdateUserPasswordEmail(user: any) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL,
        pass: process.env.SMTP_PASS || process.env.PASSWORD,
      },
    });
    
    const updatedAtFormatted = user.updatedAt 
      ? new Date(user.updatedAt).toLocaleString() 
      : 'N/A';

    const mailOptions = {
      from: `"No-Reply" <${process.env.SMTP_USER || process.env.EMAIL}>`,
      to: user.email,
      subject: 'Your Account Credentials',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; color: #333;">
          <h2 style="color: #1E40AF; text-align: center;">Hi, ${user.firstName} ${user.lastName}!</h2>
          
          <p>We've updated your account credentials. Here are your complete account details:</p>

          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1E40AF;">
            <h3 style="color: #1E40AF; margin-top: 0;">Account Information</h3>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6; font-weight: bold; width: 30%;">Username:</td>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${user.username}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6; font-weight: bold;">Password:</td>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6; color: #1E40AF; font-weight: bold;">${user.password}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6; font-weight: bold;">Full Name:</td>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${user.firstName} ${user.lastName}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6; font-weight: bold;">Email:</td>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${user.email}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6; font-weight: bold;">Role:</td>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${user.rolename || user.roleId || 'Not assigned'}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6; font-weight: bold;">Account Status:</td>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6; color: ${user.isActive ? '#28a745' : '#dc3545'};">
                  ${user.isActive ? 'Active' : 'Inactive'}
                </td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6; font-weight: bold;">Last Updated:</td>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${updatedAtFormatted}</td>
              </tr>
            </table>
          </div>

          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <h4 style="color: #856404; margin-top: 0;">⚠️ Security Notice</h4>
            <p style="margin: 0; color: #856404;">
              For security reasons, we strongly recommend that you:
            </p>
            <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #856404;">
              <li>Log in immediately and change your password</li>
              <li>Never share your credentials with anyone</li>
            </ul>
          </div>

          <p style="font-size: 14px; color: #6b7280; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
            <strong>Note:</strong> This is an automated email. Please do not reply. 
            If you did not request this update or have any concerns about your account security, 
            please contact our support team immediately.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return { success: true, message: 'New account credentials sent via email' };
  } catch (error) {
    console.error('Failed to send new credentials:', error);
    throw error;
  }
}


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
