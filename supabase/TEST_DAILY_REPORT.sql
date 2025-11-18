-- ============================================
-- Daily Performance Report - Testing & Verification Script
-- ============================================
-- Use this script to test and verify your daily report system

-- ============================================
-- TEST 1: Check if the function exists
-- ============================================
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'send_daily_performance_report';
-- Expected: Should return 1 row with the function details

-- ============================================
-- TEST 2: Check if pg_cron is enabled
-- ============================================
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
-- Expected: Should return 1 row if pg_cron is enabled
-- If empty, run: CREATE EXTENSION pg_cron;

-- ============================================
-- TEST 3: Check if the cron job is scheduled
-- ============================================
SELECT 
  jobid,
  jobname,
  schedule,
  command,
  active,
  nodename,
  nodeport,
  database
FROM cron.job 
WHERE jobname = 'daily-performance-report';
-- Expected: Should return 1 row with schedule '0 20 * * *' (or your custom time)

-- ============================================
-- TEST 4: View cron job execution history
-- ============================================
SELECT 
  runid,
  job_pid,
  status,
  return_message,
  start_time,
  end_time,
  end_time - start_time as duration
FROM cron.job_run_details
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname = 'daily-performance-report')
ORDER BY start_time DESC
LIMIT 10;
-- Expected: Shows execution history (empty if job hasn't run yet)

-- ============================================
-- TEST 5: Count active users who should receive reports
-- ============================================
SELECT 
  'Members' as user_type,
  COUNT(*) as active_count
FROM members 
WHERE is_active = true

UNION ALL

SELECT 
  'Project Managers',
  COUNT(*)
FROM project_managers 
WHERE is_active = true

UNION ALL

SELECT 
  'Admins',
  COUNT(*)
FROM admins 
WHERE is_active = true

UNION ALL

SELECT 
  'TOTAL',
  (SELECT COUNT(*) FROM members WHERE is_active = true) +
  (SELECT COUNT(*) FROM project_managers WHERE is_active = true) +
  (SELECT COUNT(*) FROM admins WHERE is_active = true);
-- Expected: Shows count of each user type who will receive reports

-- ============================================
-- TEST 6: Check tasks updated today (sample data)
-- ============================================
SELECT 
  COUNT(*) as total_tasks_updated_today,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN status != 'completed' THEN 1 END) as pending,
  COUNT(CASE WHEN status != 'completed' AND due_date < NOW() THEN 1 END) as blocked
FROM tasks
WHERE updated_at >= date_trunc('day', NOW())
  AND updated_at < date_trunc('day', NOW()) + interval '1 day';
-- Expected: Shows today's task statistics that will be in the report

-- ============================================
-- TEST 7: Check deleted tasks today
-- ============================================
SELECT COUNT(*) as deleted_tasks_today
FROM deleted_tasks
WHERE task_type = 'regular'
  AND deleted_at >= date_trunc('day', NOW())
  AND deleted_at < date_trunc('day', NOW()) + interval '1 day';
-- Expected: Shows count of tasks deleted today

-- ============================================
-- TEST 8: Manual Report Generation (EXECUTE THIS TO TEST)
-- ============================================
-- ⚠️ WARNING: This will send actual notifications to all users!
-- Uncomment the line below to trigger a test report:

-- SELECT send_daily_performance_report();

-- After running above, check TEST 9 to see if notifications were created

-- ============================================
-- TEST 9: Check recent report notifications
-- ============================================
SELECT 
  n.user_id,
  COALESCE(m.name, pm.name, a.name) as recipient_name,
  CASE 
    WHEN m.id IS NOT NULL THEN 'Member'
    WHEN pm.id IS NOT NULL THEN 'Project Manager'
    WHEN a.id IS NOT NULL THEN 'Admin'
    ELSE 'Unknown'
  END as user_role,
  n.title,
  LEFT(n.message, 100) as message_preview,
  n.is_read,
  n.created_at
FROM notifications n
LEFT JOIN members m ON n.user_id = m.id
LEFT JOIN project_managers pm ON n.user_id = pm.id
LEFT JOIN admins a ON n.user_id = a.id
WHERE n.type = 'report'
  AND n.created_at >= NOW() - interval '1 hour'
ORDER BY n.created_at DESC
LIMIT 20;
-- Expected: Shows recent report notifications (after running TEST 8)

-- ============================================
-- TEST 10: Count notifications by date
-- ============================================
SELECT 
  created_at::date as report_date,
  COUNT(*) as total_notifications,
  COUNT(DISTINCT user_id) as unique_recipients,
  COUNT(CASE WHEN is_read = true THEN 1 END) as read_count,
  COUNT(CASE WHEN is_read = false THEN 1 END) as unread_count
FROM notifications
WHERE type = 'report'
  AND title LIKE '📊 Daily Performance Report%'
GROUP BY created_at::date
ORDER BY report_date DESC
LIMIT 30;
-- Expected: Shows daily report delivery statistics

-- ============================================
-- TEST 11: View a sample report message
-- ============================================
SELECT 
  title,
  message,
  created_at
FROM notifications
WHERE type = 'report'
ORDER BY created_at DESC
LIMIT 1;
-- Expected: Shows the most recent report notification content

-- ============================================
-- TEST 12: Check if reports are being delivered on schedule
-- ============================================
WITH expected_reports AS (
  SELECT generate_series(
    (NOW() - interval '7 days')::date,
    NOW()::date,
    interval '1 day'
  )::date as expected_date
)
SELECT 
  e.expected_date,
  COUNT(n.id) as notifications_sent,
  CASE 
    WHEN COUNT(n.id) > 0 THEN '✅ Delivered'
    WHEN e.expected_date = CURRENT_DATE THEN '⏳ Pending Today'
    WHEN e.expected_date > CURRENT_DATE THEN '⏭️ Future'
    ELSE '❌ Missing'
  END as status
FROM expected_reports e
LEFT JOIN notifications n ON n.created_at::date = e.expected_date AND n.type = 'report'
GROUP BY e.expected_date
ORDER BY e.expected_date DESC;
-- Expected: Shows report delivery status for last 7 days

-- ============================================
-- TEST 13: Verify notification table structure
-- ============================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'notifications'
ORDER BY ordinal_position;
-- Expected: Shows notifications table schema

-- ============================================
-- TEST 14: Check RLS policies on notifications
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'notifications'
ORDER BY policyname;
-- Expected: Shows RLS policies (should allow users to read their own notifications)

-- ============================================
-- SUMMARY: System Health Check
-- ============================================
DO $$
DECLARE
  function_exists boolean;
  cron_enabled boolean;
  job_scheduled boolean;
  active_users_count int;
  last_report_time timestamp;
BEGIN
  -- Check function
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'send_daily_performance_report'
  ) INTO function_exists;
  
  -- Check pg_cron
  SELECT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) INTO cron_enabled;
  
  -- Check job
  SELECT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'daily-performance-report'
  ) INTO job_scheduled;
  
  -- Count users
  SELECT 
    (SELECT COUNT(*) FROM members WHERE is_active = true) +
    (SELECT COUNT(*) FROM project_managers WHERE is_active = true) +
    (SELECT COUNT(*) FROM admins WHERE is_active = true)
  INTO active_users_count;
  
  -- Get last report time
  SELECT MAX(created_at) INTO last_report_time
  FROM notifications WHERE type = 'report';
  
  -- Display summary
  RAISE NOTICE '=================================================';
  RAISE NOTICE '📊 DAILY PERFORMANCE REPORT - SYSTEM STATUS';
  RAISE NOTICE '=================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Function Exists: %', CASE WHEN function_exists THEN '✅ YES' ELSE '❌ NO - Run migration!' END;
  RAISE NOTICE 'pg_cron Enabled: %', CASE WHEN cron_enabled THEN '✅ YES' ELSE '❌ NO - Enable in dashboard!' END;
  RAISE NOTICE 'Cron Job Scheduled: %', CASE WHEN job_scheduled THEN '✅ YES' ELSE '❌ NO - Run setup script!' END;
  RAISE NOTICE 'Active Recipients: % users', active_users_count;
  RAISE NOTICE 'Last Report Sent: %', COALESCE(last_report_time::text, 'Never (run manual test)');
  RAISE NOTICE '';
  
  IF function_exists AND cron_enabled AND job_scheduled AND active_users_count > 0 THEN
    RAISE NOTICE '🎉 System is fully configured and ready!';
    RAISE NOTICE '📅 Reports will be sent automatically at 8 PM daily';
  ELSE
    RAISE NOTICE '⚠️  System needs configuration. See issues above.';
  END IF;
  
  RAISE NOTICE '=================================================';
END $$;

-- ============================================
-- QUICK FIXES
-- ============================================

-- If pg_cron is not enabled, uncomment and run:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- If job is not scheduled, uncomment and run:
-- SELECT cron.schedule(
--   'daily-performance-report',
--   '0 20 * * *',
--   $$SELECT send_daily_performance_report();$$
-- );

-- To manually trigger a test report (sends real notifications!), uncomment and run:
-- SELECT send_daily_performance_report();

-- To remove/reschedule the job, uncomment and run:
-- SELECT cron.unschedule('daily-performance-report');

-- ============================================
-- END OF TESTING SCRIPT
-- ============================================
