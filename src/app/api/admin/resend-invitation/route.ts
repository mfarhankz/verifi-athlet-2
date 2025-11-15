import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Import and check supabaseAdmin configuration
    let supabaseAdmin;
    try {
      const { supabaseAdmin: admin } = await import('@/lib/supabaseClient');
      supabaseAdmin = admin;
      
      if (!supabaseAdmin) {
        console.error('Supabase admin client not configured - missing service role key');
        return NextResponse.json({ 
          error: 'Server configuration error',
          details: 'Missing service role key'
        }, { status: 500 });
      }
      
    } catch (importError) {
      console.error('Supabase import error:', importError);
      return NextResponse.json({ 
        error: 'Server import error',
        details: importError instanceof Error ? importError.message : 'Unknown import error'
      }, { status: 500 });
    }

    // Verify admin access first
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin access (package ID 3)
    const { data: adminAccess, error: adminError } = await supabaseAdmin
      .from('user_access_override')
      .select('*')
      .eq('user_id', user.id)
      .eq('customer_package_id', 3)
      .is('access_end', null)
      .maybeSingle();

    if (adminError || !adminAccess) {
      console.error('Admin access error:', adminError);
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { email } = await request.json();

    // Validate inputs
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Generate recovery link for existing users
    console.log('Generating recovery link for user:', email);
    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.verifiedathletics.com'}/set-password`;
    
    // Use admin.generateLink to create a recovery link for existing users
    const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: redirectUrl,
      }
    });

    if (linkError) {
      console.error('Error generating recovery link:', linkError);
      return NextResponse.json({ 
        error: linkError.message || 'Failed to generate invite link',
        details: linkError
      }, { status: 400 });
    }

    if (!data.properties || !data.properties.action_link) {
      console.error('No action link in response');
      return NextResponse.json({ 
        error: 'Failed to generate invite link',
        details: 'No action link returned'
      }, { status: 500 });
    }

    console.log('Recovery link generated successfully:', data.properties.action_link);

    // Send the email using ElasticEmail
    const { sendEmail, createInvitationEmail } = await import('@/lib/emailService');
    const { subject, htmlBody } = createInvitationEmail(data.properties.action_link, email);
    
    console.log('Sending invitation email to:', email);
    const emailResult = await sendEmail({
      to: email,
      subject,
      htmlBody,
    });

    if (!emailResult.success) {
      console.error('Failed to send email:', emailResult.error);
      return NextResponse.json({ 
        error: 'Failed to send invitation email',
        details: emailResult.error
      }, { status: 500 });
    }

    console.log('Invitation email sent successfully to:', email);

    const successResponse = {
      success: true,
      message: 'Invitation email resent successfully',
      user: {
        email: email,
      },
    };
    
    return NextResponse.json(successResponse);

  } catch (error) {
    console.error('Error in resend invitation API:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

