import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { randomBytes } from 'crypto';

// Simple in-memory rate limiting (for production, use Redis or Upstash)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS_PER_WINDOW = 5; // 5 requests per 15 minutes per IP

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  record.count++;
  return true;
}

// Generate cryptographically secure random password
function generateSecurePassword(): string {
  const length = 24;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  const randomValues = randomBytes(length);
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += charset[randomValues[i] % charset.length];
  }
  
  // Ensure password has at least one of each required type
  if (!/[a-z]/.test(password)) password = password.slice(0, -1) + 'a';
  if (!/[A-Z]/.test(password)) password = password.slice(0, -1) + 'A';
  if (!/[0-9]/.test(password)) password = password.slice(0, -1) + '0';
  if (!/[!@#$%^&*]/.test(password)) password = password.slice(0, -1) + '!';
  
  return password;
}

export async function POST(request: NextRequest) {
  // Enable debug mode in development
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  try {
    // Import and check supabaseAdmin configuration
    if (!supabaseAdmin) {
      console.error('Supabase admin client not configured - missing service role key');
      return NextResponse.json({ 
        error: 'Server configuration error'
      }, { status: 500 });
    }

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ 
        error: 'Too many requests. Please try again later.'
      }, { status: 429 });
    }

    const { email, athleteId, firstName, lastName } = await request.json();

    // Validate inputs
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    
    if (!normalizedEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Validate email length
    if (normalizedEmail.length > 255) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    if (!athleteId || typeof athleteId !== 'string') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Validate UUID format for athleteId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(athleteId)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Check if user already exists using getUserByEmail (more efficient and secure)
    // Note: Supabase doesn't have a direct getUserByEmail, so we'll try to create
    // and handle the error, or use a more efficient approach
    // For now, we'll let Supabase handle duplicate detection during user creation
    
    // Validate that the athlete exists BEFORE attempting user creation
    console.log('Validating athlete:', athleteId);
    const { data: athleteData, error: athleteError } = await supabaseAdmin
      .from('athlete')
      .select('id')
      .eq('id', athleteId)
      .single();

    if (athleteError || !athleteData) {
      // Don't reveal whether athlete exists or not
      console.error('Athlete validation error:', athleteError);
      return NextResponse.json({ 
        error: 'Invalid request'
      }, { status: 400 });
    }

    console.log('Athlete validated:', athleteData);

    // Create auth user without sending confirmation email
    // Using email_confirm: true to mark email as confirmed without sending email
    console.log('Creating auth user for:', normalizedEmail);
    
    // Generate cryptographically secure random password - user will need to reset it later if they want to log in
    const randomPassword = generateSecurePassword();
    
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: randomPassword,
      email_confirm: true, // Mark email as confirmed without sending confirmation email
      user_metadata: {
        first_name: firstName || null,
        last_name: lastName || null,
      }
    });

    if (createError) {
      console.error('❌ Error creating user:', {
        message: createError.message,
        status: createError.status,
        name: createError.name,
        code: createError.code,
        email: normalizedEmail,
        fullError: createError
      });
      
      // Check for duplicate user error
      const isDuplicateError = 
        createError.message?.includes('already registered') || 
        createError.message?.includes('already exists') ||
        createError.message?.includes('User already registered') ||
        createError.message?.toLowerCase().includes('duplicate') ||
        createError.status === 422; // Supabase often uses 422 for validation errors
      
      if (isDuplicateError) {
        // Return generic error to prevent account enumeration
        console.log('⚠️ User already exists for email:', normalizedEmail);
        return NextResponse.json({ 
          error: 'Account creation failed. Please try again or contact support.'
        }, { status: 400 });
      }
      
      // Log full error in development for debugging
      if (isDevelopment) {
        console.error('Full createUser error:', JSON.stringify(createError, null, 2));
      }
      
      return NextResponse.json({ 
        error: 'Account creation failed. Please try again later.'
      }, { status: 500 });
    }

    if (!userData.user) {
      console.error('User creation returned no user data');
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    console.log('User created successfully:', userData.user.id);

    // Create athlete_user_detail record
    console.log('Creating athlete_user_detail record:', {
      id: userData.user.id,
      athlete_id: athleteId,
      name_first: firstName,
      name_last: lastName
    });

    const { error: detailError } = await supabaseAdmin
      .from('athlete_user_detail')
      .insert({
        id: userData.user.id,
        athlete_id: athleteId,
        name_first: firstName || null,
        name_last: lastName || null,
      });

    if (detailError) {
      console.error('❌ Error creating athlete_user_detail:', {
        message: detailError.message,
        code: detailError.code,
        details: detailError.details,
        hint: detailError.hint,
        userId: userData.user.id,
        athleteId: athleteId,
        fullError: detailError
      });
      
      // Log full error in development for debugging
      if (isDevelopment) {
        console.error('Full athlete_user_detail insert error:', JSON.stringify(detailError, null, 2));
      }
      
      // Try to clean up the auth user if detail creation fails
      try {
        await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
        console.log('✅ Cleaned up auth user after athlete_user_detail creation failed');
      } catch (cleanupError) {
        console.error('❌ Failed to clean up auth user:', cleanupError);
      }
      
      return NextResponse.json({ 
        error: 'Account creation failed. Please try again later.'
      }, { status: 500 });
    }

    console.log('Athlete user detail record created successfully');

    // Generate a magic link token for secure auto-signin
    // This is more secure than returning the password - we use a one-time token
    console.log('Generating magic link for secure auto-signin');
    
    try {
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: normalizedEmail,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/college-selector`,
        }
      });

      if (linkError) {
        console.error('Error generating magic link:', linkError);
        // Fall back to returning password if magic link fails (not ideal but allows flow to continue)
        console.warn('⚠️ Falling back to password-based signin (less secure)');
        return NextResponse.json({
          success: true,
          message: 'Account created successfully',
          email: normalizedEmail,
          temporaryPassword: randomPassword,
          usePasswordSignIn: true
        });
      }

      // Always return password for reliable client-side sign-in
      // Magic link can be used for email verification later if needed
      // For now, we'll use password sign-in which is more reliable for immediate authentication
      console.log('Magic link generated successfully, but using password sign-in for reliability');
      return NextResponse.json({
        success: true,
        message: 'Account created successfully',
        email: normalizedEmail,
        temporaryPassword: randomPassword,
        usePasswordSignIn: true
      });
      
    } catch (sessionError) {
      console.error('Error generating magic link:', sessionError);
      // Fallback to password if magic link generation fails
      return NextResponse.json({
        success: true,
        message: 'Account created successfully',
        email: normalizedEmail,
        temporaryPassword: randomPassword,
        usePasswordSignIn: true
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error in create athlete user API:', error);
    
    // In development, return more details for debugging
    if (isDevelopment) {
      return NextResponse.json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, { status: 500 });
    }
    
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
