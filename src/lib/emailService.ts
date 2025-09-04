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