import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, createAlertNotificationEmail } from '@/lib/emailService';
import { supabase, supabaseAdmin } from '@/lib/supabaseClient';

// Recipient email addresses
const RECIPIENT_EMAILS = {
  andrew: 'andrew@verifiedathletics.com',
  shane: 'shane@verifiedathletics.com',
  nate: 'nate@verifiedathletics.com',
  patty: 'patty@verifiedathletics.com',
};

// Function to determine recipients based on sport abbreviation
function getRecipientsForSport(sportAbbrev: string | null | undefined): string[] {
  if (!sportAbbrev) {
    return [RECIPIENT_EMAILS.nate];
  }

  const abbrev = sportAbbrev.toLowerCase();

  // Football -> Shane and Patty
  if (abbrev === 'fb') {
    return [RECIPIENT_EMAILS.shane, RECIPIENT_EMAILS.patty];
  }

  // Andrew's sports
  if (['msoc', 'wsoc', 'mbb', 'mwswm', 'wswm', 'bsb', 'mwre', 'mten', 'wten'].includes(abbrev)) {
    return [RECIPIENT_EMAILS.andrew];
  }

  // Patty's sports
  if (['wvol', 'wbb', 'sb', 'mtaf', 'wtaf', 'mglf', 'wglf', 'mlax', 'wlax'].includes(abbrev)) {
    return [RECIPIENT_EMAILS.patty];
  }

  // Default to Nate for unknown sports
  return [RECIPIENT_EMAILS.nate];
}

export async function POST(request: NextRequest) {
  try {
    const alertData = await request.json();

    // Validate required fields
    if (!alertData.rule || alertData.filter === undefined || !alertData.createdAt) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        details: 'rule, filter, and createdAt are required'
      }, { status: 400 });
    }

    // Fetch additional data to enrich the email
    let schoolName: string | undefined;
    let sportName: string | undefined;
    let sportAbbrev: string | undefined;
    let createdByName: string | undefined;
    let createdByEmail: string | undefined;
    let recipientDetails: string | undefined;

    // Get school name and sport from customer_id
    if (alertData.customerId) {
      try {
        // First, get customer data with school
        const { data: customerData, error: customerError } = await supabase
          .from('customer')
          .select(`
            id,
            school_id,
            sport_id,
            school:school_id (
              id,
              name
            )
          `)
          .eq('id', alertData.customerId)
          .single();

        if (!customerError && customerData) {
          const school = customerData.school as unknown as { id: string; name: string } | null;
          if (school?.name) {
            schoolName = school.name;
          }

          // Fetch sport data using hardcoded mapping
          if (customerData.sport_id !== null && customerData.sport_id !== undefined) {
            const sportId = Number(customerData.sport_id);
            
            // Use hardcoded mapping from queries.ts
            const sportIdToAbbrev: Record<number, string> = {
              1: 'mbb',
              2: 'wbb',
              3: 'msoc',
              4: 'wsoc',
              5: 'wvol',
              6: 'bsb',
              7: 'sb',
              8: 'mcc',
              9: 'wcc',
              10: 'mglf',
              11: 'wglf',
              12: 'mlax',
              13: 'wlax',
              14: 'mten',
              15: 'wten',
              16: 'mtaf',
              17: 'wtaf',
              18: 'mswm',
              19: 'wswm',
              20: 'mwre',
              21: 'fb',
            };

            const sportIdToName: Record<number, string> = {
              1: "Men's Basketball",
              2: "Women's Basketball",
              3: "Men's Soccer",
              4: "Women's Soccer",
              5: "Women's Volleyball",
              6: "Baseball",
              7: "Softball",
              8: "Men's Cross Country",
              9: "Women's Cross Country",
              10: "Men's Golf",
              11: "Women's Golf",
              12: "Men's Lacrosse",
              13: "Women's Lacrosse",
              14: "Men's Tennis",
              15: "Women's Tennis",
              16: "Men's Track & Field",
              17: "Women's Track & Field",
              18: "Men's Swimming",
              19: "Women's Swimming",
              20: "Men's Wrestling",
              21: "Football",
            };

            if (!isNaN(sportId) && sportIdToAbbrev[sportId]) {
              sportAbbrev = sportIdToAbbrev[sportId];
              sportName = sportIdToName[sportId] || sportAbbrev.toUpperCase();
            }
          }
        } else {
          console.error('Error fetching customer data:', customerError);
        }
      } catch (error) {
        console.error('Error fetching customer data:', error);
        // Continue without customer data if there's an error
      }
    }

    // Get creator name and email from user_id
    if (alertData.userId) {
      try {
        // Get name from user_detail
        const { data: userData, error: userError } = await supabase
          .from('user_detail')
          .select('name_first, name_last')
          .eq('id', alertData.userId)
          .single();

        if (!userError && userData) {
          const firstName = userData.name_first || '';
          const lastName = userData.name_last || '';
          if (firstName || lastName) {
            createdByName = `${firstName} ${lastName}`.trim();
          }
        }

        // Get email from auth (using admin client)
        if (supabaseAdmin) {
          try {
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(alertData.userId);
            if (!authError && authData?.user?.email) {
              createdByEmail = authData.user.email;
            }
          } catch (authErr) {
            console.error('Error fetching user email:', authErr);
            // Continue without email if there's an error
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        // Continue without creator data if there's an error
      }
    }

    // Convert recipient IDs to human-readable format
    if (alertData.recipient) {
      if (alertData.recipient === 'entire_staff') {
        recipientDetails = 'Entire Staff';
      } else {
        // Recipient is comma-separated user IDs
        const recipientIds = alertData.recipient.split(',').map((id: string) => id.trim()).filter(Boolean);
        if (recipientIds.length > 0 && supabaseAdmin) {
          try {
            const recipientInfoList: string[] = [];
            
            // Fetch user details and emails in parallel
            const [userDetailsResult, emailResults] = await Promise.all([
              // Get names from user_detail
              supabase
                .from('user_detail')
                .select('id, name_first, name_last')
                .in('id', recipientIds),
              // Get emails from auth (batch via getUserById)
              Promise.allSettled(
                recipientIds.map((id: string) => 
                  supabaseAdmin.auth.admin.getUserById(id)
                    .then(({ data, error }: { data: any; error: any }) => ({ id, email: (!error && data?.user?.email) ? data.user.email : null }))
                    .catch(() => ({ id, email: null }))
                )
              )
            ]);

            const { data: userDetails } = userDetailsResult;
            const userDetailsMap = new Map<string, { name_first?: string; name_last?: string }>();
            if (userDetails) {
              userDetails.forEach((user: any) => {
                userDetailsMap.set(user.id, { name_first: user.name_first, name_last: user.name_last });
              });
            }

            const emailMap = new Map<string, string | null>();
            emailResults.forEach((result: any) => {
              if (result.status === 'fulfilled' && result.value) {
                emailMap.set(result.value.id, result.value.email);
              }
            });

            // Build recipient info strings
            recipientIds.forEach((id: string) => {
              const userDetail = userDetailsMap.get(id);
              const email = emailMap.get(id);
              const firstName = userDetail?.name_first || '';
              const lastName = userDetail?.name_last || '';
              const name = `${firstName} ${lastName}`.trim();
              
              if (name && email) {
                recipientInfoList.push(`${name} (${email})`);
              } else if (name) {
                recipientInfoList.push(name);
              } else if (email) {
                recipientInfoList.push(email);
              } else {
                recipientInfoList.push(id);
              }
            });

            recipientDetails = recipientInfoList.join(', ');
          } catch (error) {
            console.error('Error fetching recipient details:', error);
            recipientDetails = alertData.recipient; // Fallback to IDs
          }
        } else {
          recipientDetails = alertData.recipient; // Fallback to IDs if no admin client
        }
      }
    }

    // Determine recipients based on sport, and always include Nate
    const sportRecipients = getRecipientsForSport(sportAbbrev);
    const recipients = Array.from(new Set([...sportRecipients, RECIPIENT_EMAILS.nate]));

    // Create email content
    const { subject, htmlBody } = createAlertNotificationEmail({
      rule: alertData.rule,
      filter: alertData.filter || '',
      recipient: recipientDetails || alertData.recipient || '',
      recipientIds: alertData.recipient || '',
      createdBy: createdByName,
      createdByEmail: createdByEmail,
      createdById: alertData.userId,
      schoolName: schoolName,
      sportName: sportName,
      sportAbbrev: sportAbbrev,
      customerId: alertData.customerId,
      surveyAlert: alertData.surveyAlert || false,
      alertType: alertData.alertType || 'tp_alert',
      alertFrequency: alertData.alertFrequency,
      weeklyDay: alertData.weeklyDay,
      createdAt: alertData.createdAt,
    });

    // Send email to sport-specific recipients
    const emailResults = await Promise.allSettled(
      recipients.map(recipient =>
        sendEmail({
          to: recipient,
          subject,
          htmlBody,
        })
      )
    );

    // Check if any emails failed
    const failedEmails = emailResults
      .map((result, index) => {
        if (result.status === 'rejected') {
          return { recipient: recipients[index], error: result.reason };
        }
        if (result.status === 'fulfilled' && !result.value.success) {
          return { recipient: recipients[index], error: result.value.error };
        }
        return null;
      })
      .filter(Boolean);

    if (failedEmails.length > 0) {
      console.error('Some alert notification emails failed to send:', failedEmails);
      // Still return success if at least one email was sent
      const successCount = emailResults.length - failedEmails.length;
      if (successCount === 0) {
        return NextResponse.json({ 
          success: false,
          error: 'All emails failed to send',
          failedEmails
        }, { status: 500 });
      }
      return NextResponse.json({ 
        success: true,
        warning: `Some emails failed to send (${failedEmails.length} failed, ${successCount} succeeded)`,
        failedEmails
      });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Alert notification emails sent successfully'
    });

  } catch (error) {
    console.error('Error sending alert notification:', error);
    return NextResponse.json({ 
      error: 'Failed to send alert notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

