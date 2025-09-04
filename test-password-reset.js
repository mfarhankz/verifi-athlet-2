#!/usr/bin/env node

/**
 * Test script for the new password reset flow
 * Run with: node test-password-reset.js
 */

const fetch = require('node-fetch');

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';

async function testPasswordReset() {
  console.log('🧪 Testing Password Reset Flow\n');
  
  try {
    // Step 1: Send reset code
    console.log('1️⃣ Sending reset code...');
    const sendResponse = await fetch(`${BASE_URL}/api/send-reset-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: TEST_EMAIL }),
    });

    const sendData = await sendResponse.json();
    
    if (!sendResponse.ok) {
      console.error('❌ Failed to send code:', sendData.error);
      return;
    }

    console.log('✅ Code sent successfully');
    
    if (sendData.code) {
      console.log(`📧 Code: ${sendData.code} (Development mode)`);
    } else {
      console.log('📧 Code sent via email (Production mode)');
    }

    // Step 2: Verify code (using the code from response in dev mode)
    if (sendData.code) {
      console.log('\n2️⃣ Verifying code...');
      const verifyResponse = await fetch(`${BASE_URL}/api/verify-reset-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: TEST_EMAIL,
          code: sendData.code 
        }),
      });

      const verifyData = await verifyResponse.json();
      
      if (!verifyResponse.ok) {
        console.error('❌ Failed to verify code:', verifyData.error);
        return;
      }

      console.log('✅ Code verified successfully');
      console.log(`👤 User ID: ${verifyData.userId}`);
    } else {
      console.log('\n2️⃣ Skipping code verification (no code in response)');
    }

    console.log('\n🎉 Password reset flow test completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Set up your environment variables (see PASSWORD_RESET_README.md)');
    console.log('2. Run the database migration');
    console.log('3. Test the full flow in the browser at /reset-password');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure the development server is running (npm run dev)');
    console.log('2. Check that the API endpoints are accessible');
    console.log('3. Verify your environment variables are set correctly');
  }
}

// Run the test
testPasswordReset(); 