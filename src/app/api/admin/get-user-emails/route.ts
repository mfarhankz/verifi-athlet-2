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

    // Validate all user IDs are valid UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const invalidIds = userIds.filter((id: string) => typeof id !== 'string' || !uuidRegex.test(id));
    if (invalidIds.length > 0) {
      return NextResponse.json({ 
        error: 'Invalid user ID format', 
        details: `${invalidIds.length} invalid UUID(s) found. All user IDs must be valid UUIDs.`
      }, { status: 400 });
    }

    console.log('Fetching emails for user IDs:', userIds.length);

    const userEmailMap = new Map<string, string>();
    const userIdsSet = new Set(userIds); // For O(1) lookup
    
    // Strategy: For large datasets, use optimized getUserById with proper concurrency pool
    // For smaller datasets, try listUsers first with limited pages
    if (userIds.length > 5000) {
      // Large dataset: Use concurrency pool pattern with safety measures
      const maxConcurrent = 150; // Reduced from 250 to avoid rate limits
      const totalUsers = userIds.length;
      const requestTimeout = 10000; // 10 second timeout per request
      const maxRetries = 2;
      
      console.log(`Processing ${totalUsers} users with max ${maxConcurrent} concurrent requests...`);
      
      // Track errors for monitoring
      const errors: { rateLimit: number; other: number } = { rateLimit: 0, other: 0 };
      const failedUserIds: string[] = [];
      
      // Helper to fetch with retry and timeout
      const fetchUserWithRetry = async (userId: string, retryCount = 0): Promise<{ userId: string; email: string } | null> => {
        try {
          // Add timeout protection
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), requestTimeout)
          );
          
          const userPromise = supabaseAdmin.auth.admin.getUserById(userId)
            .then(({ data, error }: { data: any; error: any }) => {
              if (error) {
                // Check for rate limiting (429 or 503)
                if (error.status === 429 || error.status === 503 || error.message?.includes('rate limit')) {
                  errors.rateLimit++;
                  throw new Error('RATE_LIMIT');
                }
                errors.other++;
                return null;
              }
              if (data?.user) {
                return { userId, email: data.user.email || 'No Email' };
              }
              return null;
            });
          
          const result = await Promise.race([userPromise, timeoutPromise]) as { userId: string; email: string } | null;
          return result;
        } catch (error: any) {
          // Retry on rate limit or timeout (up to maxRetries)
          if ((error.message === 'RATE_LIMIT' || error.message === 'Request timeout') && retryCount < maxRetries) {
            // Exponential backoff: wait 1s, 2s
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
            return fetchUserWithRetry(userId, retryCount + 1);
          }
          
          // Track failed users
          if (!failedUserIds.includes(userId)) {
            failedUserIds.push(userId);
          }
          
          return null;
        }
      };
      
      // Process with concurrency pool - maintain maxConcurrent requests in flight
      let index = 0;
      const inFlight = new Set<Promise<void>>();
      const startTime = Date.now();
      
      while (index < totalUsers || inFlight.size > 0) {
        // Check for timeout (prevent infinite loops)
        if (Date.now() - startTime > 300000) { // 5 minute max
          console.error('Operation timeout after 5 minutes');
          break;
        }
        
        // Start new requests up to concurrency limit
        while (inFlight.size < maxConcurrent && index < totalUsers) {
          const userId = userIds[index];
          index++;
          
          const promise = fetchUserWithRetry(userId)
            .then((result) => {
              if (result) {
                userEmailMap.set(result.userId, result.email);
              }
            })
            .catch(() => {
              // Errors already handled in fetchUserWithRetry
            })
            .finally(() => {
              inFlight.delete(promise);
            });
          
          inFlight.add(promise);
          
          // If we hit rate limits, slow down
          if (errors.rateLimit > 0 && errors.rateLimit % 50 === 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        // Wait for at least one promise to complete before continuing
        if (inFlight.size > 0 && (inFlight.size >= maxConcurrent || index >= totalUsers)) {
          await Promise.race(inFlight);
        }
      }
      
      // Log final progress with error details
      console.log(`Completed: ${userEmailMap.size}/${totalUsers} users found`);
      if (errors.rateLimit > 0 || errors.other > 0 || failedUserIds.length > 0) {
        console.warn(`Errors - Rate limits: ${errors.rateLimit}, Other: ${errors.other}, Failed: ${failedUserIds.length}`);
      }
    } else {
      // Smaller dataset: Try listUsers first (limited pages), then fallback to getUserById
      const pageSize = 1000;
      const maxPages = 10; // Limit to first 10 pages (10k users) to avoid slow pagination
      let currentPage = 0;
      let foundCount = 0;
      
      // Try listUsers with page limit
      while (foundCount < userIds.length && currentPage < maxPages) {
        const { data: userList, error: listError } = await supabaseAdmin.auth.admin.listUsers({
          page: currentPage,
          perPage: pageSize
        });
        
        if (listError || !userList?.users || userList.users.length === 0) {
          break;
        }

        // Filter and store emails for requested users
        userList.users.forEach((authUser: any) => {
          if (userIdsSet.has(authUser.id)) {
            userEmailMap.set(authUser.id, authUser.email || 'No Email');
            foundCount++;
          }
        });

        // Early termination if we've found all users
        if (foundCount >= userIds.length) {
          break;
        }

        // If we got fewer results than pageSize, we've reached the end
        if (userList.users.length < pageSize) {
          break;
        }

        currentPage++;
      }

      // Fallback: Use getUserById for any remaining users
      const remainingUserIds = userIds.filter(id => !userEmailMap.has(id));
      
      if (remainingUserIds.length > 0) {
        console.log(`Fetching ${remainingUserIds.length} remaining users via getUserById...`);
        const fallbackBatchSize = 75;
        
        for (let i = 0; i < remainingUserIds.length; i += fallbackBatchSize) {
          const batch = remainingUserIds.slice(i, i + fallbackBatchSize);
          
          const batchPromises = batch.map(async (userId: string) => {
            try {
              const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
              if (!userError && userData?.user) {
                return { userId, email: userData.user.email || 'No Email' };
              }
              return null;
            } catch (error) {
              return null;
            }
          });
          
          const batchResults = await Promise.allSettled(batchPromises);
          batchResults.forEach((result) => {
            if (result.status === 'fulfilled' && result.value) {
              userEmailMap.set(result.value.userId, result.value.email);
            }
          });
        }
      }
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
