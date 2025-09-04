import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json({ error: 'Email and code are required' }, { status: 400 });
    }

    // Import Supabase admin
    let supabaseAdmin;
    try {
      const { supabaseAdmin: admin } = await import('../../../lib/supabaseClient');
      supabaseAdmin = admin;
      
      if (!supabaseAdmin) {
        return NextResponse.json({ 
          error: 'Server configuration error',
          details: 'Missing SUPABASE_SERVICE_ROLE_KEY environment variable'
        }, { status: 500 });
      }
    } catch (importError) {
      return NextResponse.json({ 
        error: 'Server configuration error',
        details: 'Failed to initialize database connection'
      }, { status: 500 });
    }

    // Verify the code against the database
    const { data: codeData, error: codeError } = await supabaseAdmin
      .from('password_reset_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (codeError) {
      return NextResponse.json({ 
        error: 'Invalid or expired verification code',
        details: codeError.message 
      }, { status: 400 });
    }

    if (!codeData) {
      return NextResponse.json({ error: 'Invalid or expired verification code' }, { status: 400 });
    }

    // Mark the code as used
    const { error: updateError } = await supabaseAdmin
      .from('password_reset_codes')
      .update({ 
        used: true, 
        used_at: new Date().toISOString() 
      })
      .eq('id', codeData.id);

    if (updateError) {
      // Don't fail the request if we can't mark it as used
    }

    // Get user ID for password update
    let allUsers: any[] = [];
    let page = 0;
    const perPage = 1000;
    
    while (true) {
      const { data: userList, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page: page,
        perPage: perPage
      });
      
      if (listError) {
        return NextResponse.json({ error: 'Unable to verify account' }, { status: 500 });
      }

      if (!userList.users || userList.users.length === 0) {
        break;
      }

      allUsers = allUsers.concat(userList.users);
      
      if (userList.users.length < perPage) {
        break;
      }
      
      page++;
    }

    const user = allUsers.find((u: any) => 
      u.email && u.email.toLowerCase() === email.toLowerCase()
    );
    
    if (!user) {
      return NextResponse.json({ error: 'No account found with that email address' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Code verified successfully',
      userId: user.id
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 