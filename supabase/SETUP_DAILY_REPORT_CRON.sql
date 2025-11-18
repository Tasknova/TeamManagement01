-- ============================================
-- Daily Performance Report Setup Script
-- ============================================
-- Run this script in your Supabase SQL Editor to set up the daily report system
-- This will schedule automatic reports at 8 PM every day

-- Step 1: Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Step 2: Verify the send_daily_performance_report function exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'send_daily_performance_report'
  ) THEN
    RAISE EXCEPTION 'Function send_daily_performance_report() does not exist. Please run the migration first.';
  END IF;
END $$;

-- Step 3: Remove any existing schedule for this job (if it exists)
DO $$
BEGIN
  -- Only unschedule if the job exists
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-performance-report') THEN
    PERFORM cron.unschedule('daily-performance-report');
    RAISE NOTICE 'Removed existing job schedule';
  ELSE
    RAISE NOTICE 'No existing job found, proceeding with new schedule';
  END IF;
END $$;

-- Step 4: Schedule the daily report at 8 PM (20:00 UTC)
-- ⚠️ IMPORTANT: Adjust the time based on your timezone
-- 
-- Examples:
-- - For India (IST, UTC+5:30): '0 14 * * *' (8 PM IST = 2:30 PM UTC, but use 14:30 for simplicity)
-- - For US Eastern (EST, UTC-5): '0 1 * * *' (8 PM EST = 1 AM UTC next day)
-- - For US Pacific (PST, UTC-8): '0 4 * * *' (8 PM PST = 4 AM UTC next day)
-- - For UK (GMT/BST): '0 20 * * *' (8 PM GMT = 8 PM UTC)
-- - For Australia (AEST, UTC+10): '0 10 * * *' (8 PM AEST = 10 AM UTC)

SELECT cron.schedule(
  'daily-performance-report',        -- Job name
  '0 20 * * *',                       -- Schedule: At 20:00 (8 PM) every day - ADJUST FOR YOUR TIMEZONE!
  $$SELECT send_daily_performance_report();$$  -- SQL command to execute
);

-- Step 5: Verify the job was scheduled successfully
SELECT 
  jobid,
  jobname,
  schedule,
  command,
  active
FROM cron.job
WHERE jobname = 'daily-performance-report';

-- Expected output: One row showing your scheduled job

-- ============================================
-- Optional: Manual Testing
-- ============================================

-- Test 1: Manually trigger the report right now
-- Uncomment the line below to test:
-- SELECT send_daily_performance_report();

-- Test 2: Check if notifications were created
-- Uncomment to view recent report notifications:
-- SELECT 
--   user_id,
--   title,
--   message,
--   created_at
-- FROM notifications
-- WHERE type = 'report'
-- ORDER BY created_at DESC
-- LIMIT 10;

-- Test 3: Count recipients by role
-- Uncomment to see breakdown:
-- SELECT 
--   CASE 
--     WHEN EXISTS (SELECT 1 FROM members WHERE members.id = n.user_id) THEN 'Member'
--     WHEN EXISTS (SELECT 1 FROM project_managers WHERE project_managers.id = n.user_id) THEN 'Project Manager'
--     WHEN EXISTS (SELECT 1 FROM admins WHERE admins.id = n.user_id) THEN 'Admin'
--     ELSE 'Unknown'
--   END as user_role,
--   COUNT(*) as notification_count
-- FROM notifications n
-- WHERE type = 'report'
--   AND created_at::date = CURRENT_DATE
-- GROUP BY user_role;

-- ============================================
-- Monitoring Queries
-- ============================================

-- Monitor job execution history (last 20 runs)
-- Uncomment to view:
-- SELECT 
--   jobid,
--   runid,
--   job_pid,
--   database,
--   username,
--   command,
--   status,
--   return_message,
--   start_time,
--   end_time
-- FROM cron.job_run_details
-- WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname = 'daily-performance-report')
-- ORDER BY start_time DESC
-- LIMIT 20;

-- View daily report statistics
-- Uncomment to view:
-- SELECT 
--   created_at::date as report_date,
--   COUNT(*) as total_notifications_sent,
--   COUNT(DISTINCT user_id) as unique_recipients,
--   MIN(created_at) as first_sent_at,
--   MAX(created_at) as last_sent_at
-- FROM notifications
-- WHERE type = 'report'
--   AND title LIKE '📊 Daily Performance Report%'
-- GROUP BY created_at::date
-- ORDER BY report_date DESC
-- LIMIT 30;

-- ============================================
-- Success Message
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Daily Performance Report system is now set up!';
  RAISE NOTICE '📅 Reports will be sent automatically at 8 PM every day';
  RAISE NOTICE '📧 All active Members, Project Managers, and Admins will receive notifications';
  RAISE NOTICE '🔍 Use the monitoring queries above to track report delivery';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Make sure to adjust the schedule time for your timezone!';
  RAISE NOTICE '    Current schedule is set for 8 PM UTC (20:00)';
END $$;
