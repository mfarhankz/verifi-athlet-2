// Test CloudFront after fixing the public key
const testAfterFix = async () => {
  try {
    console.log('🧪 Testing CloudFront after public key fix...\n');
    
    // Wait a moment for any changes to take effect
    console.log('⏳ Waiting 5 seconds for any changes to propagate...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Get configuration
    const configResponse = await fetch('http://localhost:3000/api/test-cloudfront');
    const config = await configResponse.json();
    
    console.log('📋 Configuration:');
    console.log(`   Domain: ${config.config.domain}`);
    console.log(`   Key Pair ID: ${config.config.keyPairId}\n`);
    
    // Test signed URL generation
    const testUrl = `https://${config.config.domain}/test-video.mp4`;
    console.log(`🔗 Testing: ${testUrl}`);
    
    const signedResponse = await fetch('http://localhost:3000/api/cloudfront-signed-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoUrl: testUrl }),
    });
    
    if (signedResponse.ok) {
      const signedData = await signedResponse.json();
      console.log('✅ Signed URL generated');
      
      // Test the signed URL
      try {
        const testResponse = await fetch(signedData.signedUrl, { method: 'HEAD' });
        console.log(`📊 Status: ${testResponse.status}`);
        
        if (testResponse.status === 200) {
          console.log('🎉 SUCCESS! Your CloudFront configuration is working!');
          console.log('✅ Videos should now load properly in your VideoComponent');
          console.log(`🔗 Working URL: ${signedData.signedUrl.substring(0, 100)}...`);
        } else if (testResponse.status === 403) {
          console.log('❌ Still getting 403 Forbidden');
          console.log('🔧 Possible issues:');
          console.log('   1. Key Group not saved properly');
          console.log('   2. Distribution not deployed yet');
          console.log('   3. Wrong Key Group selected in behavior');
          console.log('   4. Using "Trusted Signers" instead of "Trusted Key Groups"');
        } else if (testResponse.status === 404) {
          console.log('⚠️  404 Not Found - File path issue');
          console.log('   The signed URL is working, but the test file doesn\'t exist');
          console.log('   Try with a real video file path');
        }
        
        // Show response headers for debugging
        console.log('\n📋 Response Headers:');
        for (const [key, value] of testResponse.headers.entries()) {
          console.log(`   ${key}: ${value}`);
        }
        
      } catch (fetchError) {
        console.log('❌ Network error:', fetchError.message);
      }
    } else {
      console.log('❌ Failed to generate signed URL');
    }
    
    console.log('\n📝 If still getting 403 errors:');
    console.log('1. Double-check that you\'re using "Trusted Key Groups" not "Trusted Signers"');
    console.log('2. Verify the Key Group is saved with the correct public key');
    console.log('3. Wait for CloudFront deployment (5-15 minutes)');
    console.log('4. Check that your distribution status is "Deployed"');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

testAfterFix();
