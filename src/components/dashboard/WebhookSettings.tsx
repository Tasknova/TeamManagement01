import React, { useState, useEffect } from 'react';
import { webhookSettingsService, WebhookSetting } from '../../services/webhookSettings';
import { supabase } from '../../lib/supabase';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Bell, BellOff, Save, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

export const WebhookSettings: React.FC = () => {
  const [webhookSetting, setWebhookSetting] = useState<WebhookSetting | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);

  useEffect(() => {
    loadWebhookSetting();
  }, []);

  const loadWebhookSetting = async () => {
    try {
      setLoading(true);
      const setting = await webhookSettingsService.getWebhookSetting();
      setWebhookSetting(setting);
      setIsEnabled(setting?.setting_value?.enabled || false);
    } catch (error) {
      console.error('Error loading webhook setting:', error);
      toast.error('Failed to load webhook settings');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    try {
      setSaving(true);
      const newEnabled = !isEnabled;
      const success = await webhookSettingsService.toggleWebhook(newEnabled);
      
      if (success) {
        setIsEnabled(newEnabled);
        toast.success(
          newEnabled 
            ? '✅ Task webhook notifications enabled' 
            : '🔕 Task webhook notifications disabled'
        );
      } else {
        toast.error('Failed to update webhook setting');
      }
    } catch (error) {
      console.error('Error toggling webhook:', error);
      toast.error('Failed to update webhook setting');
    } finally {
      setSaving(false);
    }
  };

  const handleSendDailyReport = async () => {
    // Check if webhook is enabled before sending
    if (!isEnabled) {
      toast.error('Please enable webhook notifications first');
      return;
    }

    try {
      setSendingReport(true);
      
      // Call the database function to send daily performance report
      const { data, error } = await supabase.rpc('send_daily_performance_report');
      
      if (error) {
        console.error('Error sending daily report:', error);
        toast.error('Failed to send report');
        return;
      }
      
      toast.success('Report will be sent on your Discord');
    } catch (error) {
      console.error('Error sending daily report:', error);
      toast.error('Failed to send report');
    } finally {
      setSendingReport(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading webhook settings...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Task Webhook Notifications
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Control Discord notifications for task changes
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {isEnabled ? (
              <Bell className="w-5 h-5 text-green-600" />
            ) : (
              <BellOff className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>

        {/* Toggle Section */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Webhook Status</h4>
              <p className="text-sm text-gray-600 mt-1">
                {isEnabled 
                  ? 'Notifications are currently active and will be sent to Discord'
                  : 'Notifications are currently disabled'
                }
              </p>
            </div>
            <Button
              onClick={handleToggle}
              disabled={saving}
              variant={isEnabled ? "outline" : "default"}
              className={`flex items-center space-x-2 ${
                isEnabled 
                  ? 'border-red-300 text-red-700 hover:bg-red-50' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isEnabled ? (
                <>
                  <BellOff className="w-4 h-4" />
                  <span>Disable</span>
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4" />
                  <span>Enable</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Webhook URL Info */}
        {webhookSetting && (
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Webhook Configuration</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-700">Webhook URL:</span>
                <span className="text-sm text-blue-600 font-mono">
                  {webhookSetting.setting_value.url}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-700">Status:</span>
                <span className={`text-sm font-medium ${
                  isEnabled ? 'text-green-600' : 'text-red-600'
                }`}>
                  {isEnabled ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Information */}
        <div className="bg-yellow-50 rounded-lg p-4">
          <h4 className="font-medium text-yellow-900 mb-2">What gets notified?</h4>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>• Task creation (INSERT)</li>
            <li>• Task updates (UPDATE)</li>
            <li>• Task deletion (DELETE)</li>
          </ul>
          <p className="text-xs text-yellow-700 mt-2">
            Each notification includes task details, assigned user, project, and operation type.
          </p>
        </div>

        {/* Daily Performance Report Section */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Daily Performance Report</h4>
              <p className="text-sm text-gray-600 mt-1">
                {isEnabled 
                  ? 'Send today\'s performance report to Discord' 
                  : 'Enable webhook to send reports'}
              </p>
            </div>
            <Button
              onClick={handleSendDailyReport}
              disabled={sendingReport || !isEnabled}
              className={`flex items-center space-x-2 ${
                !isEnabled 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white`}
            >
              {sendingReport ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Report</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
