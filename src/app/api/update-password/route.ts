import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { userId, password } = await request.json();

    if (!userId || !password) {
      return NextResponse.json({ error: 'User ID and password are required' }, { status: 400 });
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

    // Update the user's password using admin API
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: password }
    );

    if (updateError) {
      return NextResponse.json({ 
        error: 'Failed to update password',
        details: updateError.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Password updated successfully'
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 