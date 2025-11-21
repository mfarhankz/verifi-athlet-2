export interface EmailOptions {
  to: string;
  subject: string;
  htmlBody: string;
  from?: string;
}

export const sendEmail = async (options: EmailOptions): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!process.env.ELASTICEMAIL_API_KEY) {
      throw new Error('ELASTICEMAIL_API_KEY environment variable is not set');
    }

    // Use ElasticEmail v2 API with simpler format
    const formData = new URLSearchParams();
    formData.append('apikey', process.env.ELASTICEMAIL_API_KEY);
    formData.append('from', options.from || process.env.ELASTICEMAIL_FROM_EMAIL || 'noreply@verifiedathletics.com');
    formData.append('to', options.to);
    formData.append('subject', options.subject);
    formData.append('bodyHtml', options.htmlBody);
    formData.append('isTransactional', 'true');

    const response = await fetch('https://api.elasticemail.com/v2/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    });

    const data = await response.text();
    
    // Try to parse as JSON first
    try {
      const jsonData = JSON.parse(data);
      if (jsonData.success && jsonData.data && jsonData.data.messageid) {
        return { success: true };
      } else {
        return { success: false, error: jsonData.error || 'Failed to send email' };
      }
    } catch (parseError) {
      // If not JSON, check for plain text success
      if (response.ok && data.includes('MessageID')) {
        return { success: true };
      } else {
        return { success: false, error: data || 'Failed to send email' };
      }
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
};

export const createPasswordResetEmail = (code: string, email: string) => {
  const subject = 'Password Reset Code - Verified Athletics';
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset - Verified Athletics</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: rgb(28, 29, 77); margin: 0; font-size: 28px;">Verified Athletics</h1>
        </div>
        
        <h2 style="color: rgb(28, 29, 77); margin-bottom: 20px;">Password Reset Request</h2>
        
        <p style="margin-bottom: 20px;">Hello,</p>
        
        <p style="margin-bottom: 20px;">You requested a password reset for your Verified Athletics account (${email}).</p>
        
        <p style="margin-bottom: 20px;">Your verification code is:</p>
        
        <div style="background-color: #f8f9fa; padding: 25px; text-align: center; border-radius: 8px; margin: 25px 0; border: 2px solid #e9ecef;">
          <h1 style="color: #1677ff; font-size: 36px; margin: 0; letter-spacing: 6px; font-weight: bold;">${code}</h1>
        </div>
        
        <p style="margin-bottom: 20px;"><strong>This code will expire in 15 minutes.</strong></p>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #856404;">
            <strong>Security Notice:</strong> If you didn't request this password reset, please ignore this email. 
            Your account security is important to us.
          </p>
        </div>
        
        <p style="margin-bottom: 20px;">To complete your password reset:</p>
        <ol style="margin-bottom: 20px;">
          <li>Return to the Verified Athletics app</li>
          <li>Enter the verification code above</li>
          <li>Create your new password</li>
        </ol>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        
        <p style="color: #666; font-size: 12px; margin: 0; text-align: center;">
          This is an automated message from Verified Athletics. Please do not reply to this email.<br>
          If you need assistance, please contact our support team.
        </p>
      </div>
    </body>
    </html>
  `;

  return { subject, htmlBody };
};

export const createAlertNotificationEmail = (alertData: {
  rule: string;
  filter: string;
  recipient: string;
  recipientIds?: string;
  createdBy?: string;
  createdByEmail?: string;
  createdById?: string;
  schoolName?: string;
  sportName?: string;
  sportAbbrev?: string;
  customerId?: string;
  surveyAlert?: boolean;
  alertType?: 'tp_alert' | 'offer_alert';
  alertFrequency?: string;
  weeklyDay?: string | null;
  createdAt: string;
}) => {
  const subject = 'New Alert Created - Verified Athletics';
  
  // Format date
  const createdDate = new Date(alertData.createdAt).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Alert Created - Verified Athletics</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: rgb(28, 29, 77); margin: 0; font-size: 28px;">Verified Athletics</h1>
        </div>
        
        <h2 style="color: rgb(28, 29, 77); margin-bottom: 20px;">New ${alertData.alertType === 'offer_alert' ? 'Offer' : 'Transfer Portal'} Alert Created</h2>
        
        <p style="margin-bottom: 20px;">A new ${alertData.alertType === 'offer_alert' ? 'offer' : 'transfer portal'} alert has been created in the Verified Athletics system.</p>
        
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: rgb(28, 29, 77); margin-top: 0; margin-bottom: 15px;">Alert Details</h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #e9ecef;">
              <td style="padding: 10px 0; font-weight: bold; width: 150px; vertical-align: top;">Rule Name:</td>
              <td style="padding: 10px 0;">${escapeHtml(alertData.rule)}</td>
            </tr>
            ${alertData.customerId ? `
            <tr style="border-bottom: 1px solid #e9ecef;">
              <td style="padding: 10px 0; font-weight: bold; vertical-align: top;">Customer ID:</td>
              <td style="padding: 10px 0;">
                ${alertData.schoolName && alertData.sportAbbrev 
                  ? `${escapeHtml(alertData.schoolName)} {${escapeHtml(alertData.sportAbbrev.toUpperCase())}}<br><span style="font-family: monospace; font-size: 11px; color: #666;">${escapeHtml(alertData.customerId)}</span>`
                  : alertData.schoolName 
                    ? `${escapeHtml(alertData.schoolName)}<br><span style="font-family: monospace; font-size: 11px; color: #666;">${escapeHtml(alertData.customerId)}</span>`
                    : `<span style="font-family: monospace; font-size: 12px;">${escapeHtml(alertData.customerId)}</span>`
                }
              </td>
            </tr>
            ` : ''}
            ${alertData.createdById ? `
            <tr style="border-bottom: 1px solid #e9ecef;">
              <td style="padding: 10px 0; font-weight: bold; vertical-align: top;">Created By:</td>
              <td style="padding: 10px 0;">
                ${alertData.createdBy && alertData.createdByEmail
                  ? `${escapeHtml(alertData.createdBy)} (${escapeHtml(alertData.createdByEmail)})<br><span style="font-family: monospace; font-size: 11px; color: #666;">${escapeHtml(alertData.createdById)}</span>`
                  : alertData.createdBy
                    ? `${escapeHtml(alertData.createdBy)}<br><span style="font-family: monospace; font-size: 11px; color: #666;">${escapeHtml(alertData.createdById)}</span>`
                    : alertData.createdByEmail
                      ? `${escapeHtml(alertData.createdByEmail)}<br><span style="font-family: monospace; font-size: 11px; color: #666;">${escapeHtml(alertData.createdById)}</span>`
                      : `<span style="font-family: monospace; font-size: 12px;">${escapeHtml(alertData.createdById)}</span>`
                }
              </td>
            </tr>
            ` : ''}
            <tr style="border-bottom: 1px solid #e9ecef;">
              <td style="padding: 10px 0; font-weight: bold; vertical-align: top;">Recipients:</td>
              <td style="padding: 10px 0;">
                ${escapeHtml(alertData.recipient)}
                ${alertData.recipientIds && alertData.recipientIds !== alertData.recipient && alertData.recipientIds !== 'entire_staff' ? `
                  <br><span style="font-family: monospace; font-size: 11px; color: #666;">IDs: ${escapeHtml(alertData.recipientIds)}</span>
                ` : ''}
              </td>
            </tr>
            <tr style="border-bottom: 1px solid #e9ecef;">
              <td style="padding: 10px 0; font-weight: bold; vertical-align: top;">Created At:</td>
              <td style="padding: 10px 0;">${escapeHtml(createdDate)}</td>
            </tr>
            ${alertData.alertType === 'offer_alert' ? `
            <tr style="border-bottom: 1px solid #e9ecef;">
              <td style="padding: 10px 0; font-weight: bold; vertical-align: top;">Alert Type:</td>
              <td style="padding: 10px 0;"><span style="background-color: #d4edda; color: #155724; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Offer Alert</span></td>
            </tr>
            <tr style="border-bottom: 1px solid #e9ecef;">
              <td style="padding: 10px 0; font-weight: bold; vertical-align: top;">Frequency:</td>
              <td style="padding: 10px 0;">${escapeHtml(alertData.alertFrequency || 'daily')}${alertData.alertFrequency === 'weekly' && alertData.weeklyDay ? ` (${escapeHtml(alertData.weeklyDay)})` : ''}</td>
            </tr>
            ` : alertData.surveyAlert ? `
            <tr style="border-bottom: 1px solid #e9ecef;">
              <td style="padding: 10px 0; font-weight: bold; vertical-align: top;">Alert Type:</td>
              <td style="padding: 10px 0;"><span style="background-color: #e7f3ff; color: #0066cc; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Survey Alert</span></td>
            </tr>
            ` : ''}
          </table>
        </div>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 15px; margin: 20px 0;">
          <h4 style="margin-top: 0; margin-bottom: 10px; color: #856404;">Filter Criteria:</h4>
          <div style="background-color: #ffffff; padding: 15px; border-radius: 4px; font-family: monospace; font-size: 13px; color: #333; white-space: pre-wrap; word-break: break-word;">${escapeHtml(alertData.filter || '(No filter specified)')}</div>
        </div>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        
        <p style="color: #666; font-size: 12px; margin: 0; text-align: center;">
          This is an automated notification from Verified Athletics.<br>
          Please do not reply to this email.
        </p>
      </div>
    </body>
    </html>
  `;

  return { subject, htmlBody };
};

export const createInaccurateActivityEmail = (data: {
  activityType: string;
  schoolName: string;
  athleteName: string;
  athleteId: string;
  activityId: string;
  markedBy: string;
  markedByEmail?: string;
  markedAt: string;
  offerDate?: string;
  source?: string;
}) => {
  const subject = 'Activity Marked as Inaccurate - Verified Athletics';
  
  // Format dates
  const markedDate = new Date(data.markedAt).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });
  
  const offerDateFormatted = data.offerDate 
    ? new Date(data.offerDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'N/A';
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Activity Marked as Inaccurate - Verified Athletics</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: rgb(28, 29, 77); margin: 0; font-size: 28px;">Verified Athletics</h1>
        </div>
        
        <h2 style="color: rgb(28, 29, 77); margin-bottom: 20px;">Activity Marked as Inaccurate</h2>
        
        <p style="margin-bottom: 20px;">An activity has been marked as inaccurate in the Verified Athletics system.</p>
        
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: rgb(28, 29, 77); margin-top: 0; margin-bottom: 15px;">Activity Details</h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #e9ecef;">
              <td style="padding: 10px 0; font-weight: bold; width: 150px; vertical-align: top;">Activity Type:</td>
              <td style="padding: 10px 0;">${escapeHtml(data.activityType)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e9ecef;">
              <td style="padding: 10px 0; font-weight: bold; width: 150px; vertical-align: top;">Athlete:</td>
              <td style="padding: 10px 0;">${escapeHtml(data.athleteName)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e9ecef;">
              <td style="padding: 10px 0; font-weight: bold; width: 150px; vertical-align: top;">School:</td>
              <td style="padding: 10px 0;">${escapeHtml(data.schoolName)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e9ecef;">
              <td style="padding: 10px 0; font-weight: bold; width: 150px; vertical-align: top;">Activity Date:</td>
              <td style="padding: 10px 0;">${offerDateFormatted}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e9ecef;">
              <td style="padding: 10px 0; font-weight: bold; width: 150px; vertical-align: top;">Source:</td>
              <td style="padding: 10px 0;">${escapeHtml(data.source || 'N/A')}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e9ecef;">
              <td style="padding: 10px 0; font-weight: bold; width: 150px; vertical-align: top;">Marked By:</td>
              <td style="padding: 10px 0;">${escapeHtml(data.markedBy)}${data.markedByEmail ? ` (${escapeHtml(data.markedByEmail)})` : ''}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e9ecef;">
              <td style="padding: 10px 0; font-weight: bold; width: 150px; vertical-align: top;">Marked At:</td>
              <td style="padding: 10px 0;">${markedDate}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-weight: bold; width: 150px; vertical-align: top;">Activity ID:</td>
              <td style="padding: 10px 0;">${escapeHtml(data.activityId)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-weight: bold; width: 150px; vertical-align: top;">Athlete ID:</td>
              <td style="padding: 10px 0;">${escapeHtml(data.athleteId)}</td>
            </tr>
          </table>
        </div>
        
        <p style="margin-top: 20px; color: #666; font-size: 14px;">
          This activity has been marked as inaccurate and removed from the system. The activity record has been updated with an ended_at timestamp and the user who marked it as inaccurate.
        </p>
      </div>
    </body>
    </html>
  `;

  return { subject, htmlBody };
};

// Helper function to escape HTML
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

export const createInvitationEmail = (inviteLink: string, email: string) => {
  const subject = 'Invitation to Verified Athletics';
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invitation - Verified Athletics</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: rgb(28, 29, 77); margin: 0; font-size: 28px;">Verified Athletics</h1>
        </div>
        
        <h2 style="color: rgb(28, 29, 77); margin-bottom: 20px;">Welcome to Verified Athletics!</h2>
        
        <p style="margin-bottom: 20px;">Hello,</p>
        
        <p style="margin-bottom: 20px;">You've been invited to join Verified Athletics. Click the button below to set up your password and get started.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteLink}" style="background-color: #1677ff; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">Set Up Your Account</a>
        </div>
        
        <p style="margin-bottom: 20px;">Or copy and paste this link into your browser:</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; word-break: break-all; font-family: monospace; font-size: 12px; color: #666;">
          ${inviteLink}
        </div>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #856404;">
            <strong>Security Notice:</strong> This link will expire in 24 hours. If you didn't expect this invitation, please ignore this email.
          </p>
        </div>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        
        <p style="color: #666; font-size: 12px; margin: 0; text-align: center;">
          This is an automated message from Verified Athletics. Please do not reply to this email.<br>
          If you need assistance, please contact our support team.
        </p>
      </div>
    </body>
    </html>
  `;

  return { subject, htmlBody };
}; 