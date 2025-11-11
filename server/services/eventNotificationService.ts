import nodemailer from 'nodemailer';
import { storage } from '../storage'; // Your existing storage service
import { User, Task, Lead, Opportunity } from '@shared/schema'; // Your schema types

// Your company logo
const COMPANY_LOGO_URL = "https://storage.googleapis.com/crmlogs/crm_assets/Logo.png";
// URL for the "View in CRM" button (set this in your .env)
const FRONTEND_URL = process.env.FRONTEND_URL || "https://your-crm-url.com";

// Define the event types you listed
type NotificationEventType =
  | "new_lead"
  | "new_opportunity"
  | "opportunity_converted"
  | "opportunity_closed_lost" // Added this
  | "task_assigned";

/**
 * Service for handling event-based notifications with hierarchy logic.
 */
class EventNotificationService {

  /**
   * This is the main function you will call from your API routes.
   * @param actor - The user *performing* the action (req.user)
   * @param eventType - The type of event
   * @param entity - The data associated (the new lead, task, etc.)
   */
  async notifyOnEvent(actor: User, eventType: NotificationEventType, entity: any) {
    try {
      console.log(`[EventNotificationService] 🚀 Event triggered: ${eventType} by ${actor.username} (ID: ${actor.id})`);

      // 1. Get recipients based on actor's role and team
      const recipients = await this.getRecipients(actor);
      console.log(`[EventNotificationService] 👥 Found ${recipients.length} potential recipients (before filtering).`);

      // 2. Filter recipients:
      //    - Must not be the person who did the action.
      //    - Must have 'isEmailNotification' set to true (or null/undefined, defaulting to true).
      const finalRecipients = recipients.filter(user => {
        const isNotActor = user.id !== actor.id;
        
        // --- THIS IS THE NEW CHECK ---
        // Defaults to 'true' if the column is null or undefined
        const hasOptedIn = user.isEmailNotification ?? true; 
        // --------------------------

        if (isNotActor && !hasOptedIn) {
          console.log(`[EventNotificationService] 🚫 Skipped hierarchy email for ${user.username} (notifications disabled).`);
        }
        return isNotActor && hasOptedIn;
      });
      console.log(`[EventNotificationService] 👥 Found ${finalRecipients.length} final recipients (after filtering).`);


      // 3. Send emails to the hierarchy
      for (const recipient of finalRecipients) {
        console.log(`[EventNotificationService] 📧 Preparing hierarchy email for: ${recipient.username} (ID: ${recipient.id})`);
        const { subject, htmlBody } = await this.generateEventEmailContent(recipient, actor, eventType, entity);
        await this.sendEmail(recipient.email, subject, htmlBody);
      }
      
      // 4. Special Case: "Task Assigned"
      // Also notify the person the task was *assigned to*
      if (eventType === 'task_assigned' && (entity as Task).assignedUserId) {
        console.log(`[EventNotificationService] 🎯 Task event: checking assignee...`);
        const assignee = await storage.getUser((entity as Task).assignedUserId!);
        
        // --- ADDED CHECK FOR 'isEmailNotification' ---
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
   * Main router for getting recipients based on the actor's role.
   * This uses the `userType` column from your `users` table.
   */
  private async getRecipients(actor: User): Promise<User[]> {
    const role = actor.userType; // 'associate', 'team-lead', 'manager', 'admin'
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
   * An Associate's action notifies their Team Leads, Managers, and all Admins.
   * This function reads the response from your `storage.getTeamsByUserId`.
   */
  private async getRecipientsForAssociate(actor: User): Promise<User[]> {
    console.log(`[EventNotificationService] ➡️ Processing 'associate' logic...`);
    const allAdmins = await storage.getAdminUsers();
    
    // Use your existing function
    const teamData = await storage.getTeamsByUserId(actor.id);
    const teamMembers = this.extractUsersFromTeamData(teamData);

    // Filter for managers and team leads
    const managers = teamMembers.filter(user => user.userType === 'manager');
    const teamLeads = teamMembers.filter(user => user.userType === 'team-lead');
    
    const combined = this.deduplicateUsers([...allAdmins, ...managers, ...teamLeads]);
    console.log(`[EventNotificationService] ➡️ Found ${allAdmins.length} Admins, ${managers.length} Managers, ${teamLeads.length} Team Leads. Total unique: ${combined.length}`);
    return combined;
  }

  /**
   * A Team Lead's action notifies their Managers and all Admins.
   */
  private async getRecipientsForTeamLead(actor: User): Promise<User[]> {
    console.log(`[EventNotificationService] ➡️ Processing 'team-lead' logic...`);
    const allAdmins = await storage.getAdminUsers();

    const teamData = await storage.getTeamsByUserId(actor.id);
    const teamMembers = this.extractUsersFromTeamData(teamData);
    
    // Filter for managers only
    const managers = teamMembers.filter(user => user.userType === 'manager');
    
    const combined = this.deduplicateUsers([...allAdmins, ...managers]);
    console.log(`[EventNotificationService] ➡️ Found ${allAdmins.length} Admins, ${managers.length} Managers. Total unique: ${combined.length}`);
    return combined;
  }

  /**
   * A Manager's action notifies all Admins AND other Managers on their team.
   */
  private async getRecipientsForManager(actor: User): Promise<User[]> {
    console.log(`[EventNotificationService] ➡️ Processing 'manager' logic...`);
    const allAdmins = await storage.getAdminUsers();

    const teamData = await storage.getTeamsByUserId(actor.id);
    const teamMembers = this.extractUsersFromTeamData(teamData);

    // Filter for OTHER managers only
    const otherManagers = teamMembers.filter(user => user.userType === 'manager' && user.id !== actor.id);

    const combined = this.deduplicateUsers([...allAdmins, ...otherManagers]);
    console.log(`[EventNotificationService] ➡️ Found ${allAdmins.length} Admins, ${otherManagers.length} other Managers. Total unique: ${combined.length}`);
    return combined;
  }

  /**
   * An Admin's action notifies all *other* Admins.
   */
  private async getRecipientsForAdmin(actor: User): Promise<User[]> {
    console.log(`[EventNotificationService] ➡️ Processing 'admin' logic...`);
    const allAdmins = await storage.getAdminUsers();
    console.log(`[EventNotificationService] ➡️ Found ${allAdmins.length} Admins.`);
    return allAdmins; // All admins (will be filtered later)
  }

  // =================================================================
  // == EMAIL SENDING & TEMPLATES
  // =================================================================

  /**
   * Sends an email using the system's SMTP credentials.
   * This logic is copied from your `emailService.sendPasswordResetEmail`.
   */
  private async sendEmail(to: string, subject: string, htmlBody: string) {
     console.log(`[EventNotificationService] ✉️  Attempting to send email to: ${to} | Subject: ${subject}`);
     try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT || '465', 10), // Using 465
          secure: true, // Secure 'true' for port 465
          auth: {
            user: process.env.SMTP_USER || process.env.EMAIL,
            pass: process.env.SMTP_PASS || process.env.PASSWORD,
          },
        });

        const mailOptions = {
          from: `"No-Reply" <${process.env.SMTP_USER || process.env.EMAIL}>`,
          to: to,
          subject: subject,
          html: htmlBody,
        };

        await transporter.sendMail(mailOptions);
        console.log(`[EventNotificationService] ✅ Successfully sent email to: ${to}`);
     } catch (error) {
        console.error(`[EventNotificationService] ❌ FAILED to send email to ${to}:`, error);
     }
  }
  
  /**
   * Generates the HTML template for a hierarchy notification.
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
   * Generates the specific email for the user a task was *assigned to*.
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
   * A single, reusable HTML email template with your logo.
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
   * Parses the complex structure from `storage.getTeamsByUserId`
   * and returns a simple array of User objects.
   */
  private extractUsersFromTeamData(teamData: any[]): User[] {
    const allMembers: User[] = [];
    if (!teamData) {
      console.log("[EventNotificationService] 🛠️ No team data found for user.");
      return [];
    }

    for (const teamWrapper of teamData) {
      // Structure from `memberTeams`
      if (teamWrapper.team && teamWrapper.team.members) {
        for (const member of teamWrapper.team.members) {
          if (member.user) {
            allMembers.push(member.user);
          }
        }
      }
      // Structure from `createdTeamsFormatted` (which you have in storage)
      else if (teamWrapper.members) {
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
   * Helper function to remove duplicate users from a list.
   */
  private deduplicateUsers(users: User[]): User[] {
    const uniqueUsers = Array.from(new Map(users.map(user => [user.id, user])).values());
    console.log(`[EventNotificationService] 🛠️ Deduped user list from ${users.length} to ${uniqueUsers.length}.`);
    return uniqueUsers;
  }
}

// Export a single instance for your app to use
export const eventNotificationService = new EventNotificationService();