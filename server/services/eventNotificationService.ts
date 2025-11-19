import nodemailer from 'nodemailer';
import { storage } from '../storage'; // Your existing storage service
import { User, Task, Lead, Opportunity } from '@shared/schema'; // Your schema types

// Your company logo
const COMPANY_LOGO_URL = "https://storage.googleapis.com/crmlogs/crm_assets/Logo.png";
// URL for the "View in CRM" button (set this in your .env)
const FRONTEND_URL = process.env.FRONTEND_URL || "https://your-crm-url.com";

// Define the event types supported by this service
type NotificationEventType =
  | "new_lead"
  | "new_opportunity"
  | "opportunity_converted"
  | "opportunity_closed_lost"
  | "task_assigned";

/**
 * EventNotificationService
 *
 * Responsible for determining the hierarchy recipients for an event
 * (team leads, managers, admins, etc.), filtering recipients by their
 * notification preferences, and sending formatted emails.
 */
class EventNotificationService {

  // Cache a shared transporter for repeated sends with the same SMTP env config.
  private static _sharedTransporter: nodemailer.Transporter | null = null;

  /**
   * Return a shared transporter built from environment SMTP settings.
   * Caching prevents re-creating the transporter on every email send.
   */
  private getSharedTransporter() {
    if (EventNotificationService._sharedTransporter) return EventNotificationService._sharedTransporter;

    EventNotificationService._sharedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '465', 10),
      secure: true,
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL,
        pass: process.env.SMTP_PASS || process.env.PASSWORD,
      },
    });

    return EventNotificationService._sharedTransporter;
  }

  /**
   * Entrypoint used by controllers when an important event occurs.
   * It resolves recipients via role/team logic, filters by preferences,
   * and sends formatted emails to each final recipient. Handles the
   * special case of notifying the assignee for task assignment events.
   *
   * @param actor - user object performing the action
   * @param eventType - one of the supported NotificationEventType values
   * @param entity - the domain object related to the event (lead, task, etc.)
   */
  async notifyOnEvent(actor: User, eventType: NotificationEventType, entity: any) {
    try {
      console.log(`[EventNotificationService] 🚀 Event triggered: ${eventType} by ${actor.username} (ID: ${actor.id})`);

      // Resolve potential recipients based on actor's role and team
      const recipients = await this.getRecipients(actor);
      console.log(`[EventNotificationService] 👥 Found ${recipients.length} potential recipients (before filtering).`);

      // Filter out the actor and users who have disabled hierarchy emails
      const finalRecipients = recipients.filter(user => {
        const isNotActor = user.id !== actor.id;
        const hasOptedIn = user.isEmailNotification ?? true; // default to true
        if (isNotActor && !hasOptedIn) {
          console.log(`[EventNotificationService] 🚫 Skipped hierarchy email for ${user.username} (notifications disabled).`);
        }
        return isNotActor && hasOptedIn;
      });
      console.log(`[EventNotificationService] 👥 Found ${finalRecipients.length} final recipients (after filtering).`);

      // Send email to each recipient in the hierarchy
      for (const recipient of finalRecipients) {
        console.log(`[EventNotificationService] 📧 Preparing hierarchy email for: ${recipient.username} (ID: ${recipient.id})`);
        const { subject, htmlBody } = await this.generateEventEmailContent(recipient, actor, eventType, entity);
        await this.sendEmail(recipient.email, subject, htmlBody);
      }

      // Special-case: also notify the assignee when a task is assigned
      if (eventType === 'task_assigned' && (entity as Task).assignedUserId) {
        console.log(`[EventNotificationService] 🎯 Task event: checking assignee...`);
        const assignee = await storage.getUser((entity as Task).assignedUserId!);
        const hasOptedIn = assignee?.isEmailNotification ?? true;

        if (assignee && assignee.id !== actor.id && hasOptedIn) {
          console.log(`[EventNotificationService] 📧 Preparing assignee email for: ${assignee.username}`);
          const { subject, htmlBody } = this.generateTaskAssignedToUserEmail(assignee, actor, entity);
          await this.sendEmail(assignee.email, subject, htmlBody);
        } else if (assignee && !hasOptedIn) {
          console.log(`[EventNotificationService] 🚫 Skipped assignee email for ${assignee.username} (notifications disabled).`);
        } else if (assignee && assignee.id === actor.id) {
          console.log(`[EventNotificationService] 🚫 Skipped assignee email (assignee is the actor).`);
        }
      }

    } catch (error) {
      console.error(`[EventNotificationService] ❌ FAILED to send notifications for ${eventType}:`, error);
    }
  }

  // =================================================================
  // == ROLE-SPECIFIC RECIPIENT LOGIC
  // =================================================================

  /**
   * Route the actor to the correct recipient resolver based on role.
   */
  private async getRecipients(actor: User): Promise<User[]> {
    const role = actor.userType; // expected: 'associate' | 'team-lead' | 'manager' | 'admin'
    console.log(`[EventNotificationService] 🧑‍💻 Getting recipients for userType: ${role}`);

    switch (role) {
      case 'associate':
        return this.getRecipientsForAssociate(actor);
      case 'team-lead':
        return this.getRecipientsForTeamLead(actor);
      case 'manager':
        return this.getRecipientsForManager(actor);
      case 'admin':
        return this.getRecipientsForAdmin(actor);
      default:
        console.warn(`[EventNotificationService] ⚠️ Unknown userType for recipient logic: ${role}`);
        return [];
    }
  }

  /**
   * Associate -> notify Team Leads, Managers, and all Admins
   */
  private async getRecipientsForAssociate(actor: User): Promise<User[]> {
    console.log(`[EventNotificationService] ➡️ Processing 'associate' logic...`);
    const allAdmins = await storage.getAdminUsers();
    const teamData = await storage.getTeamsByUserId(actor.id);
    const teamMembers = this.extractUsersFromTeamData(teamData);

    const managers = teamMembers.filter(user => user.userType === 'manager');
    const teamLeads = teamMembers.filter(user => user.userType === 'team-lead');

    const combined = this.deduplicateUsers([...allAdmins, ...managers, ...teamLeads]);
    console.log(`[EventNotificationService] ➡️ Found ${allAdmins.length} Admins, ${managers.length} Managers, ${teamLeads.length} Team Leads. Total unique: ${combined.length}`);
    return combined;
  }

  /**
   * Team Lead -> notify Managers and all Admins
   */
  private async getRecipientsForTeamLead(actor: User): Promise<User[]> {
    console.log(`[EventNotificationService] ➡️ Processing 'team-lead' logic...`);
    const allAdmins = await storage.getAdminUsers();
    const teamData = await storage.getTeamsByUserId(actor.id);
    const teamMembers = this.extractUsersFromTeamData(teamData);

    const managers = teamMembers.filter(user => user.userType === 'manager');
    const combined = this.deduplicateUsers([...allAdmins, ...managers]);
    console.log(`[EventNotificationService] ➡️ Found ${allAdmins.length} Admins, ${managers.length} Managers. Total unique: ${combined.length}`);
    return combined;
  }

  /**
   * Manager -> notify Admins and other Managers on team
   */
  private async getRecipientsForManager(actor: User): Promise<User[]> {
    console.log(`[EventNotificationService] ➡️ Processing 'manager' logic...`);
    const allAdmins = await storage.getAdminUsers();
    const teamData = await storage.getTeamsByUserId(actor.id);
    const teamMembers = this.extractUsersFromTeamData(teamData);

    const otherManagers = teamMembers.filter(user => user.userType === 'manager' && user.id !== actor.id);
    const combined = this.deduplicateUsers([...allAdmins, ...otherManagers]);
    console.log(`[EventNotificationService] ➡️ Found ${allAdmins.length} Admins, ${otherManagers.length} other Managers. Total unique: ${combined.length}`);
    return combined;
  }

  /**
   * Admin -> notify all Admins
   */
  private async getRecipientsForAdmin(actor: User): Promise<User[]> {
    console.log(`[EventNotificationService] ➡️ Processing 'admin' logic...`);
    const allAdmins = await storage.getAdminUsers();
    console.log(`[EventNotificationService] ➡️ Found ${allAdmins.length} Admins.`);
    return allAdmins;
  }

  // =================================================================
  // == EMAIL SENDING & TEMPLATES
  // =================================================================

  /**
   * Send a plain HTML email to a recipient using SMTP config from env.
   */
  private async sendEmail(to: string, subject: string, htmlBody: string) {
     console.log(`[EventNotificationService] ✉️  Attempting to send email to: ${to} | Subject: ${subject}`);
     try {
        const transporter = this.getSharedTransporter();

        const mailOptions = {
          from: `"No-Reply" <${process.env.SMTP_USER || process.env.EMAIL}>`,
          to,
          subject,
          html: htmlBody,
        };

        await transporter.sendMail(mailOptions);
        console.log(`[EventNotificationService] ✅ Successfully sent email to: ${to}`);
     } catch (error) {
        console.error(`[EventNotificationService] ❌ FAILED to send email to ${to}:`, error);
     }
  }

  /**
   * Build subject and HTML body for a given event and recipient. Uses
   * the actor and entity to craft contextual messaging.
   */
  private async generateEventEmailContent(recipient: User, actor: User, eventType: string, entity: any) {
    let subject = "";
    let message = "";
    const actorName = `${actor.firstName || ''} ${actor.lastName || ''} (${actor.username})`.trim();

    switch (eventType) {
      case "new_lead":
        const lead = entity as Lead;
        subject = `New Lead Created by ${actor.username}`;
        message = `A new lead (<strong>${lead.name || 'N/A'}</strong>) was created by ${actorName}.`;
        break;
      case "new_opportunity":
        const opp = entity as Opportunity;
        subject = `New Opportunity Created by ${actor.username}`;
        message = `A new opportunity (<strong>${opp.name || 'N/tA'}</strong>) was created by ${actorName}.`;
        break;
      case "opportunity_converted":
         const convOpp = entity as Opportunity;
         subject = `Opportunity Converted by ${actor.username}`;
         message = `An opportunity (<strong>${convOpp.name || 'N/A'}</strong>) was converted to a customer by ${actorName}.`;
         break;
      case "opportunity_closed_lost":
         const lostOpp = entity as Opportunity;
         subject = `Opportunity Closed Lost by ${actor.username}`;
         message = `An opportunity (<strong>${lostOpp.name || 'N/A'}</strong>) was marked "Closed Lost" by ${actorName}.`;
         break;
      case "task_assigned":
         const task = entity as Task;
         // Get the assignee's name for the hierarchy email
         let assigneeName = `User ID ${task.assignedUserId}`;
         if (task.assignedUserId) {
            const assignee = await storage.getUser(task.assignedUserId);
            assigneeName = assignee ? `${assignee.firstName} (${assignee.username})` : assigneeName;
         }
         subject = `Task Assigned by ${actor.username}`;
         message = `A new task (<strong>${task.title || 'N/A'}</strong>) was assigned by ${actorName} to ${assigneeName}.`;
         break;
    }

    const htmlBody = this.getHtmlTemplate(recipient, subject, message);
    return { subject, htmlBody };
  }

  /**
   * Create the HTML body used when notifying the user the task was assigned.
   */
  private generateTaskAssignedToUserEmail(assignee: User, actor: User, task: Task) {
    const actorName = `${actor.firstName || ''} ${actor.lastName || ''} (${actor.username})`.trim();
    const subject = `You have been assigned a new task: ${task.title}`;
    
    const message = `
      <p style="font-size: 16px; line-height: 1.5;">You have been assigned a new task by ${actorName}.</p>
      <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; font-size: 16px;"><strong>Task:</strong> ${task.title || 'N/A'}</p>
        <p style="margin: 10px 0 0; font-size: 16px;"><strong>Due Date:</strong> ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}</p>
      </div>
    `;

    const htmlBody = this.getHtmlTemplate(assignee, "New Task Assignment", message, "View Task");
    return { subject, htmlBody };
  }

  // =================================================================
  // == UTILITIES
  // =================================================================

  /**
   * Reusable HTML email template used across event types.
   */
  private getHtmlTemplate(recipient: User, title: string, message: string, buttonText: string = "View in CRM") {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #f9f9f9; padding: 20px; text-align: center;">
          <img src="${COMPANY_LOGO_URL}" alt="Company Logo" style="max-width: 150px;">
        </div>
        <div style="padding: 24px; color: #333;">
          <h2 style="color: #1E40AF; margin-top: 0;">${title}</h2>
          <p>Hi ${recipient.firstName || recipient.username},</p>
          ${message}
          <p style="margin-top: 24px;">
            <a href="${FRONTEND_URL}" style="background-color: #1E40AF; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              ${buttonText}
            </a>
          </p>
        </div>
        <!-- UPDATED FOOTER -->
        <div style="background-color: #f3f4f6; padding: 20px; font-size: 12px; color: #6b7280; text-align: center;">
          <p style="margin: 0;">You are receiving this notification because email alerts are enabled for your account.</p>
        </div>
      </div>
    `;
  }

  /**
   * Normalize and extract users from the various team shapes returned by storage.
   * Accepts both `memberTeams` and `createdTeamsFormatted` shaped responses.
   */
  private extractUsersFromTeamData(teamData: any[]): User[] {
    const allMembers: User[] = [];
    if (!teamData) {
      console.log("[EventNotificationService] 🛠️ No team data found for user.");
      return [];
    }

    for (const teamWrapper of teamData) {
      if (teamWrapper.team && teamWrapper.team.members) {
        for (const member of teamWrapper.team.members) {
          if (member.user) {
            allMembers.push(member.user);
          }
        }
      } else if (teamWrapper.members) {
         for (const member of teamWrapper.members) {
           if (member.user) {
            allMembers.push(member.user);
           }
         }
      }
    }
    console.log(`[EventNotificationService] 🛠️ Extracted ${allMembers.length} total members from team data.`);
    return allMembers;
  }

  /**
   * Remove duplicate users (by id) while preserving order of first occurrence.
   */
  private deduplicateUsers(users: User[]): User[] {
    const uniqueUsers = Array.from(new Map(users.map(user => [user.id, user])).values());
    console.log(`[EventNotificationService] 🛠️ Deduped user list from ${users.length} to ${uniqueUsers.length}.`);
    return uniqueUsers;
  }
}

// Export a single instance for your app to use
export const eventNotificationService = new EventNotificationService();