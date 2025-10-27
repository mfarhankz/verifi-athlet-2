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

    const { email, firstName, lastName, phone, customerId, sendEmail = true } = await request.json();

    // Validate inputs
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    // Validate that the customer exists
    console.log('Validating customer:', customerId);
    const { data: customerData, error: customerError } = await supabaseAdmin
      .from('customer')
      .select('id, sport_id, school_id')
      .eq('id', customerId)
      .single();

    if (customerError) {
      console.error('Customer validation error:', customerError);
      return NextResponse.json({ 
        error: 'Failed to validate customer',
        details: customerError.message
      }, { status: 400 });
    }

    if (!customerData) {
      console.error('Customer not found:', customerId);
      return NextResponse.json({ error: 'Customer not found' }, { status: 400 });
    }

    console.log('Customer validated:', customerData);

    // Check if user already exists
    console.log('Checking for existing user with email:', email);
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error checking existing users:', listError);
      return NextResponse.json({ error: 'Failed to check existing users' }, { status: 500 });
    }

    const existingUser = existingUsers.users.find((u: any) => 
      u.email && u.email.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
    }

    // Create user invitation
    console.log('Creating user invitation for:', email);
    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.verifiedathletics.com'}/set-password`;
    console.log('Redirect URL:', redirectUrl);
    
    const inviteOptions: any = {
      redirectTo: redirectUrl,
    };

    // Add user metadata if provided
    if (firstName || lastName) {
      inviteOptions.data = {
        first_name: firstName,
        last_name: lastName,
      };
    }

    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      inviteOptions
    );

    if (inviteError) {
      console.error('Error inviting user:', inviteError);
      return NextResponse.json({ 
        error: inviteError.message || 'Failed to invite user',
        details: inviteError
      }, { status: 400 });
    }

    console.log('User invitation successful:', inviteData.user?.id);

    // Confirm the user's email using Supabase's built-in confirm_user_email RPC
    console.log('Confirming user email for:', email);
    
    const { error: confirmEmailError } = await supabaseAdmin.rpc('confirm_user_email', {
      target_email: email
    });

    if (confirmEmailError) {
      console.error('Error confirming user email:', confirmEmailError);
      console.log('The user invitation was successful, but email confirmation failed');
      console.log('User may need to confirm their email manually');
    } else {
      console.log('User email confirmed successfully');
    }

    // Store user details and create user-customer mapping
    if (inviteData.user) {
      try {
        // Create user details record
        if (firstName || lastName || phone) {
          console.log('Creating user detail record for:', inviteData.user.id);
          const { error: userDetailError } = await supabaseAdmin
            .from('user_detail')
            .insert({
              id: inviteData.user.id,
              name_first: firstName || null,
              name_last: lastName || null,
              phone: phone || null,
            });

          if (userDetailError) {
            console.error('Error creating user details:', userDetailError);
            // Don't fail the invitation, just log the error
          } else {
            console.log('User detail record created successfully');
          }
        }

        // Create user-customer mapping
        console.log('Creating user-customer mapping:', { user_id: inviteData.user.id, customer_id: customerId });
        const { error: userCustomerError } = await supabaseAdmin
          .from('user_customer_map')
          .insert({
            user_id: inviteData.user.id,
            customer_id: customerId,
            // access_end is left null for active access
          });

        if (userCustomerError) {
          console.error('Error creating user-customer mapping:', userCustomerError);
          return NextResponse.json({ 
            error: 'User invited but failed to create customer mapping. Please contact administrator.',
            details: userCustomerError.message
          }, { status: 500 });
        }
        
        console.log('User-customer mapping created successfully');
      } catch (error) {
        console.error('Error storing user data:', error);
        return NextResponse.json({ 
          error: 'User invited but failed to complete setup. Please contact administrator.' 
        }, { status: 500 });
      }
    }

    const successResponse = {
      success: true,
      message: sendEmail ? 'Invitation sent successfully, email confirmed, and user access configured' : 'User created successfully, email confirmed, and access configured',
      user: {
        id: inviteData.user.id,
        email: inviteData.user.email,
        invited_at: inviteData.user.invited_at,
        email_confirmed: !confirmEmailError, // true if confirmation succeeded
        customer_id: customerId,
      },
    };
    
    console.log('API call completed successfully:', successResponse);
    return NextResponse.json(successResponse);

  } catch (error) {
    console.error('Error in invite user API:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
