import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
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

    // Get pagination parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '0');
    const perPage = parseInt(searchParams.get('perPage') || '50');
    const searchTerm = searchParams.get('search') || '';

    // Get all users with pagination and deduplication
    let allUsers: any[] = [];
    let currentPage = 0;
    const batchSize = 1000;
    const userMap = new Map(); // Use Map to automatically deduplicate by user ID
    
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

      // Add users to Map to automatically deduplicate by ID
      userList.users.forEach((user: any) => {
        userMap.set(user.id, user);
      });
      
      if (userList.users.length < batchSize) {
        break;
      }
      
      currentPage++;
    }
    
    // Convert Map back to array - this ensures no duplicates
    allUsers = Array.from(userMap.values());
    console.log('Total unique users after deduplication:', allUsers.length);

    // Get user details from user_detail table
    const userIds = allUsers.map(u => u.id);
    let userDetails: any[] = [];
    
    if (userIds.length > 0) {
      // Process in batches to avoid URL length limits
      const batchSize2 = 100;
      for (let i = 0; i < userIds.length; i += batchSize2) {
        const batch = userIds.slice(i, i + batchSize2);
        
        const { data: batchDetails, error: detailsError } = await supabaseAdmin
          .from('user_detail')
          .select('id, name_first, name_last, phone, last_sign_in_at')
          .in('id', batch);
        
        if (!detailsError && batchDetails) {
          userDetails = userDetails.concat(batchDetails);
        }
      }
    }

    // Users are already deduplicated from the pagination logic above

    // Combine auth users with their details
    const enrichedUsers = allUsers.map(authUser => {
      const details = userDetails.find(d => d.id === authUser.id);
      return {
        id: authUser.id,
        email: authUser.email,
        created_at: authUser.created_at,
        last_sign_in_at: details?.last_sign_in_at || null,
        email_confirmed_at: authUser.email_confirmed_at,
        invited_at: authUser.invited_at,
        confirmation_sent_at: authUser.confirmation_sent_at,
        name_first: details?.name_first || '',
        name_last: details?.name_last || '',
        phone: details?.phone || '',
        status: authUser.email_confirmed_at ? 'confirmed' : 'pending',
      };
    });
    
    console.log('Final enriched users count:', enrichedUsers.length);

    // Filter users based on search term
    let filteredUsers = enrichedUsers;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filteredUsers = enrichedUsers.filter(user => 
        user.email?.toLowerCase().includes(term) ||
        user.name_first?.toLowerCase().includes(term) ||
        user.name_last?.toLowerCase().includes(term) ||
        `${user.name_first} ${user.name_last}`.toLowerCase().includes(term)
      );
    }

    // Sort by creation date (newest first)
    filteredUsers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Apply pagination
    const total = filteredUsers.length;
    const startIndex = page * perPage;
    const endIndex = startIndex + perPage;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    return NextResponse.json({
      users: paginatedUsers,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    });

  } catch (error) {
    console.error('Error in list users API:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
