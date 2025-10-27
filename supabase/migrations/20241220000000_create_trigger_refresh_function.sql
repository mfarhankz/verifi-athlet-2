-- Create a function to trigger the refresh operation
CREATE OR REPLACE FUNCTION trigger_refresh_now()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  INSERT INTO ops.refresh_now_requests DEFAULT VALUES;
$$;

-- Drop existing function first to change return type
DROP FUNCTION IF EXISTS get_job_status(integer);

-- Create a function to get job status
CREATE OR REPLACE FUNCTION get_job_status(job_id integer)
RETURNS TABLE(
  jobid integer,
  status text,
  start_time timestamptz,
  end_time timestamptz,
  return_message text,
  job_pid integer
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    jobid,
    status,
    start_time,
    end_time,
    return_message,
    job_pid
  FROM cron.job_run_details
  WHERE jobid = job_id
  ORDER BY start_time DESC
  LIMIT 1;
$$;
