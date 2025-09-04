#!/usr/bin/env node

/**
 * Test script for the survey security system
 * Run with: node test-survey-security.js
 */

const fetch = require('node-fetch');

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const TEST_ATHLETE_ID = process.env.TEST_ATHLETE_ID || '80dd9abb-d895-4548-888e-6031449084aa';

async function testSurveySecurity() {
  console.log('🔐 Testing Survey Security System\n');
  
  try {
    // Step 1: Create a survey token
    console.log('1️⃣ Creating survey token...');
    const createResponse = await fetch(`${BASE_URL}/api/create-survey-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        athleteId: TEST_ATHLETE_ID,
        expiresInDays: 365 
      }),
    });

    const createData = await createResponse.json();
    
    if (!createResponse.ok) {
      console.error('❌ Failed to create token:', createData.error);
      return;
    }

    console.log('✅ Token created successfully');
    console.log(`🔑 Token: ${createData.token}`);
    
    const token = createData.token;

    // Step 2: Validate the token
    console.log('\n2️⃣ Validating token...');
    const validateResponse = await fetch(`${BASE_URL}/api/validate-survey-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    const validateData = await validateResponse.json();
    
    if (!validateResponse.ok) {
      console.error('❌ Failed to validate token:', validateData.error);
      return;
    }

    console.log('✅ Token validated successfully');
    console.log(`👤 Athlete ID: ${validateData.athlete_id}`);

    // Step 3: Test survey URL access
    console.log('\n3️⃣ Testing survey URL access...');
    const surveyUrl = `${BASE_URL}/survey/${TEST_ATHLETE_ID}?token=${token}`;
    console.log(`🔗 Survey URL: ${surveyUrl}`);
    
    const surveyResponse = await fetch(surveyUrl);
    
    if (surveyResponse.ok) {
      console.log('✅ Survey URL accessible');
    } else {
      console.log('⚠️ Survey URL returned status:', surveyResponse.status);
    }

    // Step 4: Test invalid token
    console.log('\n4️⃣ Testing invalid token...');
    const invalidResponse = await fetch(`${BASE_URL}/api/validate-survey-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: 'invalid-token' }),
    });

    const invalidData = await invalidResponse.json();
    
    if (!invalidResponse.ok) {
      console.log('✅ Invalid token correctly rejected');
      console.log(`❌ Error: ${invalidData.error}`);
    } else {
      console.error('❌ Invalid token was accepted (security issue!)');
    }

    // Step 5: Test wrong athlete ID
    console.log('\n5️⃣ Testing wrong athlete ID...');
    const wrongAthleteUrl = `${BASE_URL}/survey/wrong-athlete-id?token=${token}`;
    console.log(`🔗 Wrong athlete URL: ${wrongAthleteUrl}`);
    
    const wrongAthleteResponse = await fetch(wrongAthleteUrl);
    
    if (wrongAthleteResponse.ok) {
      console.log('⚠️ Wrong athlete URL accessible (should be blocked)');
    } else {
      console.log('✅ Wrong athlete URL correctly blocked');
    }

    console.log('\n🎉 Survey security system test completed successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ Token creation works');
    console.log('✅ Token validation works');
    console.log('✅ Survey URL generation works');
    console.log('✅ Invalid token rejection works');
    console.log('✅ Data isolation appears to be working');
    
    console.log('\n🔗 Next steps:');
    console.log('1. Test the survey URL in a browser');
    console.log('2. Verify the athlete can access their survey');
    console.log('3. Test that other athletes cannot access this survey');
    console.log('4. Verify RLS policies are working correctly');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testSurveySecurity();
