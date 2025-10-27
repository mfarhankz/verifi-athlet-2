import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    // Verify admin access first
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
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
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { userIds } = await request.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'User IDs array is required' }, { status: 400 });
    }

    console.log('Fetching emails for user IDs:', userIds.length);

    // Get all users from auth and filter by the requested IDs
    const userEmailMap = new Map();
    const batchSize = 1000;
    let currentPage = 0;
    
    while (true) {
      const { data: userList, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page: currentPage,
        perPage: batchSize
      });
      
      if (listError) {
        console.error('Error listing users:', listError);
        return NextResponse.json({ error: 'Failed to list users' }, { status: 500 });
      }

      if (!userList.users || userList.users.length === 0) {
        break;
      }

      // Filter users that match our requested IDs and store their emails
      userList.users.forEach((authUser: any) => {
        if (userIds.includes(authUser.id)) {
          userEmailMap.set(authUser.id, authUser.email || 'No Email');
        }
      });
      
      if (userList.users.length < batchSize) {
        break;
      }
      
      currentPage++;
    }

    console.log('Found emails for', userEmailMap.size, 'out of', userIds.length, 'requested users');

    // Convert map to object for response
    const emailData: Record<string, string> = {};
    userEmailMap.forEach((email, userId) => {
      emailData[userId] = email;
    });

    return NextResponse.json({
      success: true,
      emails: emailData,
      found: userEmailMap.size,
      requested: userIds.length
    });

  } catch (error) {
    console.error('Error in get user emails API:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
