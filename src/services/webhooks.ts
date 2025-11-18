import { supabase } from '../lib/supabase';
import { webhookSettingsService } from './webhookSettings';

export interface TaskWebhookData {
  id?: string;
  task_name?: string;
  description?: string;
  status?: string;
  old_status?: string;
  priority?: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  created_by?: string;
  created_by_name?: string;
  created_by_email?: string;
  updated_by?: string;
  updated_by_name?: string;
  updated_by_email?: string;
  project_id?: string;
  project_name?: string;
  due_date?: string;
  progress?: number;
  task_date?: string; // For daily tasks
  event_type: 'task_created' | 'task_updated' | 'task_deleted' | 'daily_task_created' | 'daily_task_updated' | 'daily_task_deleted';
  deleted_by?: string;
  deleted_by_name?: string;
  deleted_by_email?: string;
  created_at?: string;
  updated_at?: string;
}

export const webhookService = {
  /**
   * Send webhook notification for task operations
   * @param data - Task data to send
   * @returns Promise<boolean> - Success status
   */
  async sendTaskWebhook(data: TaskWebhookData): Promise<boolean> {
    try {
      console.log('🔥 WEBHOOK DEBUG: sendTaskWebhook called with:', data);
      
      // Check if webhooks are enabled
      const webhookSetting = await webhookSettingsService.getWebhookSetting();
      console.log('🔥 WEBHOOK DEBUG: webhook setting retrieved:', webhookSetting);
      
      if (!webhookSetting || !webhookSetting.setting_value?.enabled) {
        console.log('🔥 WEBHOOK DEBUG: Task webhooks are disabled, skipping notification');
        return false;
      }

      const webhookUrl = webhookSetting.setting_value.url;
      console.log('🔥 WEBHOOK DEBUG: webhook URL:', webhookUrl);
      
      if (!webhookUrl) {
        console.error('🔥 WEBHOOK DEBUG: Webhook URL not configured');
        return false;
      }

      // Prepare webhook payload - exclude IDs, only send names
      const webhookPayload: any = {
        task_id: data.id,
        task_name: data.task_name,
        description: data.description,
        status: data.status,
        priority: data.priority,
        assigned_to_name: data.user_name,
        assigned_to_email: data.user_email,
        project_name: data.project_name,
        due_date: data.due_date,
        task_date: data.task_date,
        progress: data.progress,
        event_type: data.event_type,
        created_at: data.created_at,
        updated_at: data.updated_at,
        timestamp: new Date().toISOString(),
        source: 'team_management_system'
      };

      // Add action-specific fields based on event type
      if (data.event_type === 'task_created' || data.event_type === 'daily_task_created') {
        webhookPayload.created_by = data.created_by_name;
        webhookPayload.created_by_email = data.created_by_email;
      } else if (data.event_type === 'task_updated' || data.event_type === 'daily_task_updated') {
        webhookPayload.old_status = data.old_status;
        webhookPayload.new_status = data.status;
        webhookPayload.updated_by = data.updated_by_name;
        webhookPayload.updated_by_email = data.updated_by_email;
      } else if (data.event_type === 'task_deleted' || data.event_type === 'daily_task_deleted') {
        webhookPayload.deleted_by = data.deleted_by_name;
        webhookPayload.deleted_by_email = data.deleted_by_email;
      }

      console.log('🔥 WEBHOOK DEBUG: Sending task webhook notification:', {
        url: webhookUrl,
        event_type: data.event_type,
        task_name: data.task_name,
        payload: webhookPayload
      });

      // Send webhook (non-blocking)
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
      });

      console.log('🔥 WEBHOOK DEBUG: Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (response.ok) {
        console.log('🔥 WEBHOOK DEBUG: Task webhook sent successfully');
        return true;
      } else {
        console.error('🔥 WEBHOOK DEBUG: Failed to send task webhook:', response.status, response.statusText);
        return false;
      }

    } catch (error) {
      console.error('🔥 WEBHOOK DEBUG: Error sending task webhook:', error);
      return false;
    }
  },

  /**
   * Get user information for webhook payload
   * @param userId - User ID to fetch data for
   * @returns User data or null
   */
  async getUserData(userId: string): Promise<{email?: string, name?: string} | null> {
    try {
      if (!userId) return null;

      // Try to get from members table first
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('email, name')
        .eq('id', userId)
        .maybeSingle();

      if (memberData && !memberError) {
        return memberData;
      }

      // Try admins table
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('email, name')
        .eq('id', userId)
        .maybeSingle();

      if (adminData && !adminError) {
        return adminData;
      }

      // Try project managers table
      const { data: pmData, error: pmError } = await supabase
        .from('project_managers')
        .select('email, name')
        .eq('id', userId)
        .maybeSingle();

      if (pmData && !pmError) {
        return pmData;
      }

      return null;
    } catch (error) {
      console.error('Error fetching user data for webhook:', error);
      return null;
    }
  },

  /**
   * Get project information for webhook payload
   * @param projectId - Project ID to fetch data for
   * @returns Project data or null
   */
  async getProjectData(projectId: string): Promise<{name?: string} | null> {
    try {
      if (!projectId) return null;

      const { data, error } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching project data for webhook:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching project data for webhook:', error);
      return null;
    }
  }
};