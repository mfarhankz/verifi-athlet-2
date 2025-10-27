import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
  console.log('📊 REFRESH STATUS API CALLED - This should only read data, not trigger refresh');
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

    // Check the status of job 17 using raw SQL
    const { data, error } = await supabase
      .rpc('get_job_status', { job_id: 17 });
    
    if (error) {
      console.error('Error checking refresh status:', error);
      return NextResponse.json({ error: 'Failed to check refresh status', details: error.message }, { status: 500 });
    }

    // Return the first job detail (since we're only looking for the latest one)
    const jobDetails = Array.isArray(data) ? data[0] : data;

    return NextResponse.json({ 
      success: true, 
      jobDetails: jobDetails 
    });
  } catch (error) {
    console.error('Error in refresh-status API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
