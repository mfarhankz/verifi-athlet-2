import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasSupabaseKey = !!process.env.NEXT_PUBLIC_SUPABASE_KEY;
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    const hasAdminClient = !!supabaseAdmin;

    console.log('Environment check:', {
      hasSupabaseUrl,
      hasSupabaseKey,
      hasServiceKey,
      hasAdminClient,
    });

    if (!supabaseAdmin) {
      return NextResponse.json({
        error: 'Supabase admin client not configured',
        details: {
          hasSupabaseUrl,
          hasSupabaseKey,
          hasServiceKey,
          hasAdminClient,
        }
      }, { status: 500 });
    }

    // Test admin client connection with multiple operations
    const testResults = {
      userAccessOverride: false,
      userDetail: false,
      userCustomerMap: false,
      customer: false,
    };
    
    try {
      // Test 1: Check user_access_override table
      const { data: accessData, error: accessError } = await supabaseAdmin
        .from('user_access_override')
        .select('user_id, customer_package_id')
        .limit(1);
      
      if (accessError) {
        console.error('user_access_override test failed:', accessError);
      } else {
        testResults.userAccessOverride = true;
        console.log('✅ user_access_override table accessible');
      }

      // Test 2: Check user_detail table
      const { data: detailData, error: detailError } = await supabaseAdmin
        .from('user_detail')
        .select('id, name_first')
        .limit(1);
      
      if (detailError) {
        console.error('user_detail test failed:', detailError);
      } else {
        testResults.userDetail = true;
        console.log('✅ user_detail table accessible');
      }

      // Test 3: Check user_customer_map table
      const { data: mapData, error: mapError } = await supabaseAdmin
        .from('user_customer_map')
        .select('user_id, customer_id')
        .limit(1);
      
      if (mapError) {
        console.error('user_customer_map test failed:', mapError);
      } else {
        testResults.userCustomerMap = true;
        console.log('✅ user_customer_map table accessible');
      }

      // Test 4: Check customer table
      const { data: customerData, error: customerError } = await supabaseAdmin
        .from('customer')
        .select('id, sport_id, school_id')
        .limit(1);
      
      if (customerError) {
        console.error('customer test failed:', customerError);
      } else {
        testResults.customer = true;
        console.log('✅ customer table accessible');
      }

      const allTestsPassed = Object.values(testResults).every(result => result === true);

      return NextResponse.json({
        success: allTestsPassed,
        message: allTestsPassed 
          ? 'Admin configuration is working correctly - all tables accessible' 
          : 'Admin configuration partially working - some tables may have access issues',
        config: {
          hasSupabaseUrl,
          hasSupabaseKey,
          hasServiceKey,
          hasAdminClient,
          databaseConnection: true,
        },
        tableAccess: testResults
      });

    } catch (dbError) {
      console.error('Database test error:', dbError);
      return NextResponse.json({
        error: 'Database test failed',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Config test error:', error);
    return NextResponse.json({
      error: 'Configuration test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
