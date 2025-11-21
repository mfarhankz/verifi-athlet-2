import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, createInaccurateActivityEmail } from '@/lib/emailService';

// Recipient email addresses for inaccurate activity notifications
const RECIPIENT_EMAILS = [
  'robert@verifiedathletics.com',
  'erikka@verifiedathletics.com',
  'myles@verifiedathletics.com',
  'nate@verifiedathletics.com',
  'katie@verifiedathletics.com',
  'danny@verifiedathletics.com',
];

export async function POST(request: NextRequest) {
  try {
    const notificationData = await request.json();

    // Validate required fields
    if (!notificationData.activityType || !notificationData.schoolName || !notificationData.athleteName || !notificationData.athleteId || !notificationData.activityId || !notificationData.markedBy || !notificationData.markedAt) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        details: 'activityType, schoolName, athleteName, athleteId, activityId, markedBy, and markedAt are required'
      }, { status: 400 });
    }

    // Create email content
    const { subject, htmlBody } = createInaccurateActivityEmail({
      activityType: notificationData.activityType,
      schoolName: notificationData.schoolName,
      athleteName: notificationData.athleteName,
      athleteId: notificationData.athleteId,
      activityId: notificationData.activityId,
      markedBy: notificationData.markedBy,
      markedByEmail: notificationData.markedByEmail,
      markedAt: notificationData.markedAt,
      offerDate: notificationData.offerDate,
      source: notificationData.source,
    });

    // Send email to all recipients
    const emailResults = await Promise.allSettled(
      RECIPIENT_EMAILS.map(recipient =>
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
          return { recipient: RECIPIENT_EMAILS[index], error: result.reason };
        }
        if (result.status === 'fulfilled' && !result.value.success) {
          return { recipient: RECIPIENT_EMAILS[index], error: result.value.error };
        }
        return null;
      })
      .filter(Boolean);

    if (failedEmails.length > 0) {
      console.error('Some emails failed to send:', failedEmails);
      // Still return success if at least some emails were sent
      const successCount = emailResults.length - failedEmails.length;
      if (successCount === 0) {
        return NextResponse.json({ 
          error: 'All emails failed to send',
          failedEmails 
        }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Notification emails sent successfully',
      sentCount: emailResults.length - (failedEmails.length || 0),
      failedCount: failedEmails.length || 0
    });
  } catch (error) {
    console.error('Error sending inaccurate activity notification:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

