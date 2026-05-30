/*
  # OTP Rate Limiting

  Adds a DB-level function and policy to limit OTP sends to 5 per email per hour.
  This prevents abuse where a user requests unlimited codes.

  - New function: `check_otp_rate_limit(p_email text)` — returns true if allowed
  - Uses COUNT on verification_codes table within the last hour
*/

CREATE OR REPLACE FUNCTION check_otp_rate_limit(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  recent_count integer;
BEGIN
  SELECT COUNT(*)
  INTO recent_count
  FROM verification_codes
  WHERE email = p_email
    AND created_at > now() - interval '1 hour';
  
  RETURN recent_count < 5;
END;
$$;
