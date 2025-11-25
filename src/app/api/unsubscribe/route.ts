import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const { name, email, optOutType } = await request.json();

    if (!name || !email || !optOutType) {
      return NextResponse.json({ 
        error: 'Name, email, and opt_out_type are required' 
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ 
        error: 'Invalid email format' 
      }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ 
        error: 'Server configuration error' 
      }, { status: 500 });
    }

    // Insert into unsubscribe table
    const { data, error } = await supabaseAdmin
      .from('unsubscribe')
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        opt_out_type: optOutType
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting unsubscribe record:', error);
      return NextResponse.json({ 
        error: 'Failed to process unsubscribe request' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Unsubscribe request processed successfully'
    });

  } catch (error) {
    console.error('Error processing unsubscribe request:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

