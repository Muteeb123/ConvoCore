import { storage } from '../storage';
import { InsertNotification } from '@shared/schema';

class NotificationService {
  async createNotification(notification: InsertNotification) {
    try {
      const newNotification = await storage.createNotification(notification);      
      return newNotification;
    } catch (error) {
      console.error('Failed to create notification:', error);
      throw error;
    }
  }

  async markAsRead(notificationId: number) {
    try {
      await storage.updateNotification(notificationId, { isRead: true });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  }

  async markAllAsRead(userId: number) {
    try {
      const notifications = await storage.getNotifications(userId, false);
      
      for (const notification of notifications) {
        await this.markAsRead(notification.id);
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  }

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
