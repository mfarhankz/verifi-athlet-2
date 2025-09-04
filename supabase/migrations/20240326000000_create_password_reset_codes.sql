-- Create password reset codes table
CREATE TABLE IF NOT EXISTS password_reset_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_password_reset_codes_email ON password_reset_codes(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_codes_expires_at ON password_reset_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_codes_used ON password_reset_codes(used);

-- Add RLS policies
ALTER TABLE password_reset_codes ENABLE ROW LEVEL SECURITY;

-- Only allow admins to access this table
CREATE POLICY "Only admins can access password reset codes" ON password_reset_codes
  FOR ALL USING (auth.role() = 'service_role');

-- Clean up expired codes (optional - you can run this periodically)
-- DELETE FROM password_reset_codes WHERE expires_at < NOW(); 