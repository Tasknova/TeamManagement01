# Daily Performance Report Edge Function

This Supabase Edge Function sends daily performance reports to all team members at 8 PM.

## Setup Instructions

### 1. Deploy the Edge Function

```bash
# Login to Supabase CLI
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the function
supabase functions deploy daily-performance-report
```

### 2. Schedule the Function with Supabase Cron

Option A: **Using Supabase Dashboard (Recommended)**

1. Go to your Supabase Dashboard
2. Navigate to **Database** → **Cron Jobs** (or **Extensions** → enable **pg_cron** first)
3. Create a new cron job with:
   - **Name**: `daily-performance-report`
   - **Schedule**: `0 20 * * *` (8 PM daily)
   - **Command**: 
     ```sql
     SELECT send_daily_performance_report();
     ```

Option B: **Using SQL Query**

Run this in your Supabase SQL Editor:

```sql
-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the daily report at 8 PM (20:00)
SELECT cron.schedule(
  'daily-performance-report',
  '0 20 * * *',
  $$SELECT send_daily_performance_report();$$
);
```

### 3. Verify the Schedule

Check if the cron job is scheduled:

```sql
SELECT * FROM cron.job;
```

### 4. Manual Testing

You can manually trigger the report anytime:

```sql
SELECT send_daily_performance_report();
```

Or call the Edge Function directly:

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/daily-performance-report \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## Report Contents

The daily report includes:
- **Total Tasks**: All tasks updated today
- **Completed Tasks**: Tasks marked as completed today
- **Pending Tasks**: Tasks not yet completed (updated today)
- **Blocked Tasks**: Overdue tasks not completed
- **Deleted Tasks**: Tasks deleted today

## Timezone Configuration

The cron job runs in UTC by default. To adjust for your timezone:

- For IST (India): `0 14 * * *` (8 PM IST = 2:30 PM UTC)
- For EST (Eastern): `0 1 * * *` (8 PM EST = 1 AM UTC next day)
- For PST (Pacific): `0 4 * * *` (8 PM PST = 4 AM UTC next day)

Update the cron schedule accordingly:

```sql
SELECT cron.schedule(
  'daily-performance-report',
  '0 14 * * *',  -- Adjust time for your timezone
  $$SELECT send_daily_performance_report();$$
);
```

## Notification Delivery

Reports are delivered as in-app notifications to:
- All active Members
- All active Project Managers
- All active Admins

Users will receive the notification in the Notifications page of the dashboard.

## Troubleshooting

### Cron job not running?

1. Check if pg_cron is enabled:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```

2. View cron job logs:
   ```sql
   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
   ```

3. Check for errors:
   ```sql
   SELECT * FROM cron.job_run_details WHERE status = 'failed';
   ```

### Function not working?

Check the function exists:
```sql
SELECT * FROM pg_proc WHERE proname = 'send_daily_performance_report';
```

Test the function manually:
```sql
SELECT send_daily_performance_report();
```

## Monitoring

Monitor daily reports by checking the notifications table:

```sql
SELECT 
  created_at::date as report_date,
  COUNT(*) as notifications_sent
FROM notifications
WHERE type = 'report'
AND title LIKE '📊 Daily Performance Report%'
GROUP BY created_at::date
ORDER BY report_date DESC;
```
