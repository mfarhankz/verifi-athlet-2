# Survey Security System

## Overview

The survey system has been secured with a token-based authentication system that allows athletes to access their specific surveys while maintaining strict data isolation and security.

## How It Works

### 1. Token Generation (Admin Side)
- Admins can generate secure tokens for specific athletes
- Each token is cryptographically secure and unique
- Tokens expire after 365 days (configurable)
- Tokens are hashed before storage in the database

### 2. Survey Access (Athlete Side)
- Athletes receive a secure URL with their token
- URL format: `/survey/{athleteId}?token={secureToken}`
- Token validation happens on every request
- Athletes can only access their own survey data

### 3. Data Security
- Row Level Security (RLS) policies ensure data isolation
- Athletes can only read/write their own athlete_fact records
- Database policies check for valid tokens before allowing access
- All survey data is tagged with `source = 'survey'`

## Database Schema

### Survey Tokens Table
```sql
CREATE TABLE survey_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID NOT NULL REFERENCES athlete(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE
);
```

### RLS Policies
The system includes comprehensive RLS policies that:
- Allow public access for token validation
- Restrict athlete_fact access to token holders
- Ensure athletes can only access their own data
- Maintain existing authenticated user access

## API Endpoints

### POST `/api/create-survey-token`
**Admin only** - Creates a new survey token for an athlete
```json
{
  "athleteId": "uuid",
  "expiresInDays": 30
}
```

### POST `/api/validate-survey-token`
**Public** - Validates a survey token
```json
{
  "token": "secure-token-string"
}
```

## Components

### SurveyAuthProvider
Context provider that manages survey authentication state:
- Token validation
- Session persistence
- Authentication state management

### SurveyLogin
Component for athletes to enter their survey token:
- Clean, user-friendly interface
- Error handling and validation
- Responsive design

### SurveyTokenGenerator
Admin component for generating survey tokens:
- Token generation with copy functionality
- URL generation for easy sharing
- Clear instructions for admins

## Security Features

### Token Security
- 256-bit random tokens
- SHA-256 hashing before storage
- Time-based expiration
- Single-use tracking capability

### Data Isolation
- Athletes can only access their own data
- Database-level security with RLS
- Token validation on every request
- Secure session management

### Access Control
- Public token validation
- Restricted data access
- Admin-only token generation
- Comprehensive audit trail

## Usage Flow

### For Admins
1. Navigate to athlete profile
2. Use SurveyTokenGenerator component
3. Generate token for specific athlete
4. Copy generated URL
5. Send URL to athlete via email

### For Athletes
1. Receive survey URL via email
2. Click link or enter token manually
3. Complete survey with full access to their data
4. Logout when finished

## Migration

Run the database migration to set up the security system:

```bash
supabase db push
```

This will:
- Create the survey_tokens table
- Set up RLS policies
- Configure indexes for performance
- Enable secure access patterns

## Environment Variables

No additional environment variables are required. The system uses existing Supabase configuration.

## Testing

### Development Testing
1. Generate a token using the admin interface
2. Test the survey URL in an incognito window
3. Verify data isolation between athletes
4. Test token expiration and validation

### Security Testing
1. Attempt to access other athletes' data
2. Test with expired tokens
3. Verify RLS policy enforcement
4. Test token reuse prevention

## Troubleshooting

### Common Issues

**Token Validation Failing**
- Check if token is expired
- Verify token hash in database
- Ensure RLS policies are active

**Data Access Denied**
- Verify athlete_id matches token
- Check survey_tokens table for valid entries
- Ensure source = 'survey' in athlete_fact

**Admin Token Generation Failing**
- Verify admin authentication
- Check athlete exists in database
- Ensure proper permissions

### Debug Commands

```sql
-- Check active tokens for an athlete
SELECT * FROM survey_tokens 
WHERE athlete_id = 'athlete-uuid' 
AND is_active = true 
AND expires_at > NOW();

-- Verify RLS policies
SELECT * FROM pg_policies 
WHERE tablename = 'athlete_fact';

-- Check survey data access
SELECT * FROM athlete_fact 
WHERE athlete_id = 'athlete-uuid' 
AND source = 'survey';
```

## Future Enhancements

- Token usage analytics
- Bulk token generation
- Email integration for automatic sending
- Token revocation capabilities
- Enhanced audit logging
