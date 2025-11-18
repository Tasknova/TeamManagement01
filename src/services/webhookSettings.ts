import { supabase } from '../lib/supabase';

export interface WebhookSetting {
  id: string;
  setting_key: string;
  setting_value: {
    enabled: boolean;
    url: string;
  };
  description: string;
  created_at: string;
  updated_at: string;
}

export const webhookSettingsService = {
  // Get webhook setting
  async getWebhookSetting(): Promise<WebhookSetting | null> {
    try {
      const { data, error } = await supabase
        .from('webhook_settings')
        .select('*')
        .eq('setting_key', 'task_webhook_enabled')
        .maybeSingle();

      if (error) {
        console.error('Error fetching webhook setting:', error);
        // Return default enabled webhook on error
        return {
          id: '',
          setting_key: 'task_webhook_enabled',
          setting_value: {
            enabled: true,
            url: 'https://n8nautomation.site/webhook/9f329008-2786-495e-9efd-61975bb46186'
          },
          description: 'Task webhook notifications',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }

      if (!data) {
        console.warn('No webhook settings found, using default enabled webhook');
        // Return default enabled webhook
        return {
          id: '',
          setting_key: 'task_webhook_enabled',
          setting_value: {
            enabled: true,
            url: 'https://n8nautomation.site/webhook/9f329008-2786-495e-9efd-61975bb46186'
          },
          description: 'Task webhook notifications',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }

      return data;
    } catch (error) {
      console.error('Error in getWebhookSetting:', error);
      // Return default enabled webhook on error
      return {
        id: '',
        setting_key: 'task_webhook_enabled',
        setting_value: {
          enabled: true,
          url: 'https://n8nautomation.site/webhook/9f329008-2786-495e-9efd-61975bb46186'
        },
        description: 'Task webhook notifications',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
  },

  // Update webhook setting
  async updateWebhookSetting(enabled: boolean, url?: string): Promise<WebhookSetting | null> {
    try {
      const currentSetting = await this.getWebhookSetting();
      const currentUrl = currentSetting?.setting_value?.url || 'https://n8nautomation.site/webhook/9f329008-2786-495e-9efd-61975bb46186';
      
      const { data, error } = await supabase
        .from('webhook_settings')
        .upsert({
          setting_key: 'task_webhook_enabled',
          setting_value: {
            enabled,
            url: url || currentUrl
          },
          description: 'Task webhook notifications'
        }, {
          onConflict: 'setting_key'
        })
        .select()
        .single();

      if (error) {
        console.error('Error updating webhook setting:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in updateWebhookSetting:', error);
      return null;
    }
  },

  // Toggle webhook on/off
  async toggleWebhook(enabled: boolean): Promise<boolean> {
    try {
      const result = await this.updateWebhookSetting(enabled);
      return result !== null;
    } catch (error) {
      console.error('Error in toggleWebhook:', error);
      return false;
    }
  }
};
