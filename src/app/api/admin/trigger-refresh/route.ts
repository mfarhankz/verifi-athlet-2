import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  console.log('🚨 TRIGGER REFRESH API CALLED - This should only happen when button is clicked!');
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Trigger the refresh operation
    const { error } = await supabase.rpc('trigger_refresh_now');
    
    if (error) {
      console.error('Error triggering refresh:', error);
      return NextResponse.json({ error: 'Failed to trigger refresh', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in trigger-refresh API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
