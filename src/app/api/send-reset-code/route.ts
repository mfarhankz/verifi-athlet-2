import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, createPasswordResetEmail } from '../../../lib/emailService';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Test Supabase import
    let supabaseAdmin;
    try {
      const { supabaseAdmin: admin } = await import('../../../lib/supabaseClient');
      supabaseAdmin = admin;
      
      if (!supabaseAdmin) {
        return NextResponse.json({ 
          error: 'Supabase not configured',
          details: 'Missing service role key'
        }, { status: 500 });
      }
      
    } catch (importError) {
      return NextResponse.json({ 
        error: 'Supabase import error',
        details: importError instanceof Error ? importError.message : 'Unknown import error'
      }, { status: 500 });
    }

    // Test user lookup
    try {
      // Get all users with pagination to avoid 50 user limit
      let allUsers: any[] = [];
      let page = 0;
      const perPage = 1000; // Get more users per page
      
      while (true) {
        const { data: userList, error: listError } = await supabaseAdmin.auth.admin.listUsers({
          page: page,
          perPage: perPage
        });
        
        if (listError) {
          return NextResponse.json({ 
            error: 'Database error',
            details: listError.message
          }, { status: 500 });
        }

        if (!userList.users || userList.users.length === 0) {
          break; // No more users
        }

        allUsers = allUsers.concat(userList.users);
        
        if (userList.users.length < perPage) {
          break; // Last page
        }
        
        page++;
      }
      
      // Check if user exists
      const user = allUsers.find((u: any) => 
        u.email && u.email.toLowerCase() === email.toLowerCase()
      );
      
      if (!user) {
        return NextResponse.json({ 
          error: 'No account found with that email address'
        }, { status: 404 });
      }
      
      // Generate code
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      // Store the code in the database
      const { error: insertError } = await supabaseAdmin
        .from('password_reset_codes')
        .insert({
          email,
          code,
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
          used: false
        });

      if (insertError) {
        return NextResponse.json({ 
          error: 'Failed to generate reset code',
          details: insertError.message 
        }, { status: 500 });
      }

      // Check if ElasticEmail is configured
      const hasElasticEmailKey = process.env.ELASTICEMAIL_API_KEY;
      
      if (hasElasticEmailKey) {
        try {
          // Create email content
          const { subject, htmlBody } = createPasswordResetEmail(code, email);

          // Send email using ElasticEmail
          const emailResult = await sendEmail({
            to: email,
            subject,
            htmlBody
          });

          if (!emailResult.success) {
            // Clean up the stored code if email fails
            await supabaseAdmin
              .from('password_reset_codes')
              .delete()
              .eq('email', email)
              .eq('code', code);

            return NextResponse.json({ 
              error: emailResult.error || 'Failed to send verification email' 
            }, { status: 500 });
          }

        } catch (emailError) {
          // Clean up the stored code if email fails
          await supabaseAdmin
            .from('password_reset_codes')
            .delete()
            .eq('email', email)
            .eq('code', code);

          return NextResponse.json({ 
            error: 'Failed to send email',
            details: emailError instanceof Error ? emailError.message : 'Unknown email error'
          }, { status: 500 });
        }
      } else {
        return NextResponse.json({ 
          error: 'Email service not configured',
          details: 'Please contact support'
        }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Verification code sent successfully'
      });
      
    } catch (userError) {
      return NextResponse.json({ 
        error: 'User lookup failed',
        details: userError instanceof Error ? userError.message : 'Unknown user error'
      }, { status: 500 });
    }

  } catch (error) {
    return NextResponse.json({ 
      error: 'Route error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 