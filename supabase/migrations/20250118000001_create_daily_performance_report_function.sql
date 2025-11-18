-- Create a database function to generate and send daily performance reports
-- This function will be called by a cron job at 8 PM daily
-- It also sends the report data to the webhook URL

CREATE OR REPLACE FUNCTION send_daily_performance_report()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  report_date date;
  today_start timestamptz;
  today_end timestamptz;
  total_tasks_count int;
  completed_count int;
  pending_count int;
  blocked_count int;
  deleted_count int;
  report_message text;
  webhook_url text;
  webhook_enabled boolean;
  webhook_payload jsonb;
  http_response record;
BEGIN
  -- Get today's date and time range
  report_date := CURRENT_DATE;
  today_start := date_trunc('day', now());
  today_end := today_start + interval '1 day' - interval '1 second';

  -- Calculate total tasks updated today
  SELECT COUNT(*) INTO total_tasks_count
  FROM tasks
  WHERE updated_at >= today_start AND updated_at <= today_end;

  -- Calculate completed tasks
  SELECT COUNT(*) INTO completed_count
  FROM tasks
  WHERE updated_at >= today_start 
    AND updated_at <= today_end
    AND status = 'completed';

  -- Calculate pending tasks (not completed)
  SELECT COUNT(*) INTO pending_count
  FROM tasks
  WHERE updated_at >= today_start 
    AND updated_at <= today_end
    AND status != 'completed';

  -- Calculate blocked tasks (overdue and not completed)
  SELECT COUNT(*) INTO blocked_count
  FROM tasks
  WHERE updated_at >= today_start 
    AND updated_at <= today_end
    AND status != 'completed'
    AND due_date < now();

  -- Calculate deleted tasks today
  SELECT COUNT(*) INTO deleted_count
  FROM deleted_tasks
  WHERE deleted_at >= today_start 
    AND deleted_at <= today_end
    AND task_type = 'regular';

  -- Format the report message
  report_message := format(
    E'📅 Date: %s\n\n📈 Overall Performance:\n• Total Tasks Updated: %s\n• ✅ Completed: %s\n• ⏳ Pending: %s\n• 🚫 Blocked: %s\n• 🗑️ Deleted: %s\n\nCheck the dashboard for detailed breakdown by team member.',
    report_date,
    total_tasks_count,
    completed_count,
    pending_count,
    blocked_count,
    deleted_count
  );

  -- Insert notifications for all active members
  INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
  SELECT 
    id,
    '📊 Daily Performance Report - ' || report_date,
    report_message,
    'report',
    false,
    now()
  FROM members
  WHERE is_active = true;

  -- Insert notifications for all active project managers
  INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
  SELECT 
    id,
    '📊 Daily Performance Report - ' || report_date,
    report_message,
    'report',
    false,
    now()
  FROM project_managers
  WHERE is_active = true;

  -- Insert notifications for all active admins
  INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
  SELECT 
    id,
    '📊 Daily Performance Report - ' || report_date,
    report_message,
    'report',
    false,
    now()
  FROM admins
  WHERE is_active = true;

  -- Get webhook settings
  SELECT url, is_enabled INTO webhook_url, webhook_enabled
  FROM webhook_settings
  WHERE id = 1
  LIMIT 1;

  -- If webhook is not configured, use default
  IF webhook_url IS NULL OR webhook_url = '' THEN
    webhook_url := 'https://n8nautomation.site/webhook/024b9c20-7772-46f1-89cf-00ed7bf00c43';
    webhook_enabled := true;
  END IF;

  -- Send webhook notification if enabled
  IF webhook_enabled THEN
    BEGIN
      -- Prepare webhook payload
      webhook_payload := jsonb_build_object(
        'event_type', 'daily_performance_report',
        'report_date', report_date,
        'metrics', jsonb_build_object(
          'total_tasks', total_tasks_count,
          'completed_tasks', completed_count,
          'pending_tasks', pending_count,
          'blocked_tasks', blocked_count,
          'deleted_tasks', deleted_count
        ),
        'message', report_message,
        'timestamp', now(),
        'source', 'team_management_system'
      );

      -- Send HTTP POST request to webhook URL
      SELECT * INTO http_response
      FROM http((
        'POST',
        webhook_url,
        ARRAY[http_header('Content-Type', 'application/json')],
        'application/json',
        webhook_payload::text
      )::http_request);

      RAISE NOTICE 'Webhook sent successfully to % with status %', webhook_url, http_response.status;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Failed to send webhook: %', SQLERRM;
    END;
  END IF;

  RAISE NOTICE 'Daily performance report sent successfully for %', report_date;
END;
$$;

-- Grant execute permission to authenticated users (for manual testing)
GRANT EXECUTE ON FUNCTION send_daily_performance_report() TO authenticated;

-- Create a comment about setting up the cron job
COMMENT ON FUNCTION send_daily_performance_report() IS 
'Generates and sends daily performance reports to all active users and webhook. 
To schedule this function to run daily at 8 PM, you need to:
1. Enable pg_cron extension from Supabase Dashboard > Database > Extensions
2. Run: SELECT cron.schedule(''daily-performance-report'', ''0 20 * * *'', ''SELECT send_daily_performance_report();'');
Webhook URL: https://n8nautomation.site/webhook/024b9c20-7772-46f1-89cf-00ed7bf00c43';
