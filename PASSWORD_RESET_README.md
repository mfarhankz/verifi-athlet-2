# Password Reset Flow - Email Scanner Resistant

## Overview

This new password reset flow is designed to work even when email scanners click on reset links, which was causing the previous Supabase-based flow to fail. The new system uses a **code-based verification** approach instead of single-use links.

## How It Works

### 1. **Step 1: Request Reset**
- User enters their email address
- System verifies the email exists in the database
- Generates a 6-digit verification code
- Stores the code in the database with 15-minute expiration
- Sends the code via ElasticEmail

### 2. **Step 2: Enter Code**
- User enters the 6-digit code they received
- System verifies the code against the database
- Checks that the code hasn't expired or been used
- Marks the code as used once verified

### 3. **Step 3: Set New Password**
- User enters and confirms their new password
- System updates the user's password via Supabase admin API
- Redirects to login page

## Key Benefits

✅ **Email Scanner Resistant**: No links to click, just codes to enter  
✅ **Secure**: 15-minute expiration, single-use codes, database verification  
✅ **User Friendly**: Familiar 2FA-style code entry  
✅ **Reliable**: Works even if email scanners interfere  

## Setup Requirements

### Environment Variables

Add these to your `.env.local` file:

```bash
# ElasticEmail Configuration
ELASTICEMAIL_API_KEY=your_elasticemail_api_key_here
ELASTICEMAIL_FROM_EMAIL=noreply@yourdomain.com

# Existing Supabase variables (should already be set)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_KEY=your_supabase_anon_key
```

### Database Migration

Run the database migration to create the password reset codes table:

```bash
# Apply the migration
supabase db push

# Or manually run the SQL
psql "your_supabase_connection_string" -f supabase/migrations/20240326000000_create_password_reset_codes.sql
```

## API Endpoints

### POST `/api/send-reset-code`
- **Input**: `{ email: string }`
- **Output**: `{ success: boolean, message: string, code?: string }`
- **Description**: Generates and sends verification code

### POST `/api/verify-reset-code`
- **Input**: `{ email: string, code: string }`
- **Output**: `{ success: boolean, message: string, userId: string }`
- **Description**: Verifies the code and returns user ID for password update

## Email Template

The system sends a professional HTML email with:
- Verified Athletics branding
- Large, easy-to-read verification code
- Clear instructions
- Security notice
- 15-minute expiration warning

## Security Features

- **Time-limited codes**: 15-minute expiration
- **Single-use codes**: Each code can only be used once
- **Database storage**: Codes stored securely in Supabase
- **Rate limiting**: Built into ElasticEmail
- **Audit trail**: All codes tracked with timestamps

## Development vs Production

### Development Mode
- Codes are returned in API response for testing
- Console logging for debugging
- No actual emails sent (unless configured)

### Production Mode
- Codes only sent via email
- No codes returned in API response
- Full email delivery via ElasticEmail

## Testing

1. **Start the development server**: `npm run dev`
2. **Navigate to**: `/reset-password`
3. **Enter an email**: Use a real email address
4. **Check the console**: Code will be logged in development
5. **Enter the code**: Use the code from console/logs
6. **Set new password**: Complete the reset process

## Troubleshooting

### Email Not Sending
- Check `ELASTICEMAIL_API_KEY` environment variable
- Verify ElasticEmail account is active
- Check email delivery logs in ElasticEmail dashboard

### Code Verification Failing
- Ensure database migration has been applied
- Check Supabase connection and permissions
- Verify the `password_reset_codes` table exists

### Database Errors
- Run `supabase db reset` to apply all migrations
- Check RLS policies are correctly configured
- Verify service role permissions

## Migration from Old System

The new system is completely separate from the old Supabase password reset flow. Users can use either system, but the new code-based system is recommended for better reliability.

## Support

For issues with:
- **Email delivery**: Check ElasticEmail dashboard and logs
- **Database issues**: Check Supabase dashboard and logs
- **Frontend issues**: Check browser console and network tab 