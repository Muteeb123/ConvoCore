import { storage } from '../storage';
import { InsertNotification } from '@shared/schema';

/**
 * Simple wrapper around storage notification methods with small helpers
 * for creating and marking notifications. This class centralizes
 * notification-related logic so controllers can call a single API.
 */
class NotificationService {
  /**
   * Create and persist a new notification record.
   * @param notification - Insert shape expected by storage
   */
  async createNotification(notification: InsertNotification) {
    try {
      const newNotification = await storage.createNotification(notification);
      return newNotification;
    } catch (error) {
      console.error('Failed to create notification:', error);
      throw error;
    }
  }

  /**
   * Mark a single notification as read by id.
   * @param notificationId - Primary key of the notification
   */
  async markAsRead(notificationId: number) {
    try {
      await storage.updateNotification(notificationId, { isRead: true });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications for a user as read. Fetches current
   * unread notifications and marks them one-by-one.
   * @param userId - The user's id
   */
  async markAllAsRead(userId: number) {
    try {
      const notifications = await storage.getNotifications(userId, false);

      // Mark notifications in parallel to speed up when user has many unread items.
      // Use Promise.all so DB updates run concurrently; errors bubble up.
      await Promise.all(
        notifications.map((notification: any) => this.markAsRead(notification.id))
      );
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Send an in-app task reminder to the task's assignee.
   * @param taskId - id of the task to remind about
   */
  async sendTaskReminder(taskId: number) {
    try {
      const task = await storage.getTask(taskId);

      if (task && task.assignedUserId) {
        await this.createNotification({
          userId: task.assignedUserId,
          title: 'Task Reminder',
          message: `Task "${task.title}" is due soon`,
          type: 'reminder',
          entityType: 'task',
          entityId: task.id,
        });
      }
    } catch (error) {
      console.error('Failed to send task reminder:', error);
      throw error;
    }
  }

  /**
   * Notify a user that a lead was assigned to them.
   * @param leadId - assigned lead id
   * @param userId - recipient user id
   */
  async sendLeadAssignmentNotification(leadId: number, userId: number) {
    try {
      const lead = await storage.getLead(leadId);

      if (lead) {
        await this.createNotification({
          userId: userId,
          title: 'Lead Assigned',
          message: `You have been assigned lead: ${lead.name}`,
          type: 'assignment',
          entityType: 'lead',
          entityId: lead.id,
        });
      }
    } catch (error) {
      console.error('Failed to send lead assignment notification:', error);
      throw error;
    }
  }

  /**
   * Send an in-app meeting reminder to the meeting organizer.
   * @param meetingId - id of the meeting
   */
  async sendMeetingReminder(meetingId: number) {
    try {
      const meeting = await storage.getMeeting(meetingId);

      if (meeting && meeting.organizedByUserId) {
        await this.createNotification({
          userId: meeting.organizedByUserId,
          title: 'Meeting Reminder',
          message: `Meeting "${meeting.title}" is starting soon`,
          type: 'reminder',
          entityType: 'meeting',
          entityId: meeting.id,
        });
      }
    } catch (error) {
      console.error('Failed to send meeting reminder:', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();
