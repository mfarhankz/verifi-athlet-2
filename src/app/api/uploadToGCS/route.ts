import { NextRequest, NextResponse } from 'next/server';

// Set a file size limit of 1MB as requested
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB in bytes

export async function POST(request: NextRequest) {
  try {
    console.log('API route: Starting file upload process');
    
    // Check if we're in development mode
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Check request content length if available
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
      console.warn(`API route: File too large (${Math.round(parseInt(contentLength) / 1024)}KB). Max size is ${MAX_FILE_SIZE / 1024}KB`);
      return NextResponse.json(
        { 
          error: 'File too large', 
          details: `Maximum file size is ${MAX_FILE_SIZE / 1024}KB (1MB)`,
          size: Math.round(parseInt(contentLength) / 1024)
        },
        { status: 413 }
      );
    }
    
    // Parse the form data from the request
    let formData;
    try {
      formData = await request.formData();
    } catch (formError) {
      console.error('API route: Error parsing form data:', formError);
      return NextResponse.json(
        { error: 'Invalid form data', details: formError instanceof Error ? formError.message : 'Unknown error' },
        { status: 400 }
      );
    }
    
    const file = formData.get('file') as File | null;
    const bucketName = formData.get('bucket') as string || 'excel-to-pdf-output-bucket';
    const folder = formData.get('folder') as string || '';
    
    if (!file) {
      console.error('API route: No file provided in request');
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Check file size again after parsing
    if (file.size > MAX_FILE_SIZE) {
      console.warn(`API route: File too large (${Math.round(file.size / 1024)}KB). Max size is ${MAX_FILE_SIZE / 1024}KB`);
      return NextResponse.json(
        { 
          error: 'File too large', 
          details: `Maximum file size is ${MAX_FILE_SIZE / 1024}KB (1MB)`,
          size: Math.round(file.size / 1024)
        },
        { status: 413 }
      );
    }

    console.log(`API route: Processing file ${file.name} (${Math.round(file.size / 1024)}KB)`);
    
    // Get the file name
    const fileName = file.name;
    
    // We'll use a simpler approach without requiring Google Cloud credentials directly
    // Instead, directly upload to the dedicated cloud function
    
    // Create the destination path - include folder prefix if provided
    let destFileName = fileName;
    if (folder && folder.trim() !== '') {
      // Ensure folder has trailing slash but no leading slash
      const formattedFolder = folder.trim().endsWith('/') ? folder.trim() : `${folder.trim()}/`;
      destFileName = `${formattedFolder}${fileName}`;
    }
    
    console.log('API route: Destination file path:', destFileName);
    
    // Convert File to ArrayBuffer so we can create a base64 string
    console.log('API route: Converting file to base64');
    let arrayBuffer;
    try {
      arrayBuffer = await file.arrayBuffer();
    } catch (arrayBufferError) {
      console.error('API route: Error converting file to ArrayBuffer:', arrayBufferError);
      return NextResponse.json(
        { error: 'Failed to process file', details: arrayBufferError instanceof Error ? arrayBufferError.message : 'Unknown error' },
        { status: 500 }
      );
    }
    
    const base64Data = Buffer.from(arrayBuffer).toString('base64');
    console.log(`API route: File converted to base64 (length: ${base64Data.length})`);
    
    // Return a mock success response in development mode if the cloud function isn't available
    if (isDevelopment) {
      console.log('API route: Development mode, checking if cloud function is available');
      
      // Test if the cloud function is reachable - CHANGED: don't use HEAD request
      try {
        // Instead of HEAD request, check with a minimal POST
        await fetch('https://us-central1-verified-312021.cloudfunctions.net/uploadPDF', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ test: true }), // Minimal payload for testing
          // Timeout after 500ms to avoid long wait
          signal: AbortSignal.timeout(500),
        });
        console.log('API route: Cloud function is accessible in development mode');
      } catch (e) {
        // If cloud function isn't accessible, return a mock success response
        console.log('API route: Cloud function not accessible in development mode, returning mock response', e);
        return NextResponse.json({
          success: true,
          url: `https://storage.googleapis.com/${bucketName}/${destFileName}`,
          fileName: destFileName,
          mock: true,
          message: 'Development mode: Mock success response (cloud function not accessible)'
        });
      }
    }
    
    // Create JSON payload for the API call
    const payload = {
      filename: fileName,
      contentType: file.type || 'application/pdf',
      destination: destFileName,
      bucket: bucketName,
      base64Data: base64Data
    };
    
    // Choose the appropriate cloud function URL
    // For development or testing, you might want to use a local mock
    const cloudFunctionUrl = 'https://us-central1-verified-312021.cloudfunctions.net/uploadPDF';
    
    // Call the direct PDF upload endpoint with a JSON payload
    console.log(`API route: Calling Cloud Function at ${cloudFunctionUrl}`);
    console.log(`API route: Payload details: filename=${fileName}, type=${file.type}, destination=${destFileName}, bucket=${bucketName}, base64 length=${base64Data.length}`);
    let uploadResponse;
    try {
      uploadResponse = await fetch(cloudFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      console.log(`API route: Cloud Function response status: ${uploadResponse.status}`);
    } catch (fetchError) {
      console.error('API route: Network error calling Cloud Function:', fetchError);
      
      if (isDevelopment) {
        // In development, return a mock success
        console.log('API route: Development mode - returning mock success after network error');
        return NextResponse.json({
          success: true,
          url: `https://storage.googleapis.com/${bucketName}/${destFileName}`,
          fileName: destFileName,
          mock: true,
          error: fetchError instanceof Error ? fetchError.message : 'Unknown fetch error',
          message: 'Development mode: Mock success despite network error'
        });
      }
      
      return NextResponse.json(
        { error: 'Network error calling Cloud Function', details: fetchError instanceof Error ? fetchError.message : 'Unknown error' },
        { status: 502 }
      );
    }
    
    if (!uploadResponse.ok) {
      let errorText;
      try {
        errorText = await uploadResponse.text();
      } catch (e) {
        errorText = 'Could not read error response';
      }
      console.error(`API route: Cloud Function returned error: ${uploadResponse.status} ${errorText}`);
      
      if (isDevelopment) {
        // In development, return a mock success
        console.log('API route: Development mode - returning mock success after cloud function error');
        return NextResponse.json({
          success: true,
          url: `https://storage.googleapis.com/${bucketName}/${destFileName}`,
          fileName: destFileName,
          mock: true,
          cloudError: errorText,
          message: 'Development mode: Mock success despite cloud function error'
        });
      }
      
      throw new Error(`Failed to upload to GCS via cloud function: ${uploadResponse.status} ${errorText}`);
    }
    
    let result;
    try {
      result = await uploadResponse.json();
      console.log('API route: Cloud Function response:', result);
    } catch (jsonError) {
      console.error('API route: Error parsing Cloud Function response:', jsonError);
      
      if (isDevelopment) {
        // In development, return a mock success
        console.log('API route: Development mode - returning mock success after JSON parse error');
        return NextResponse.json({
          success: true,
          url: `https://storage.googleapis.com/${bucketName}/${destFileName}`,
          fileName: destFileName,
          mock: true,
          jsonError: jsonError instanceof Error ? jsonError.message : 'Unknown JSON error',
          message: 'Development mode: Mock success despite JSON parse error'
        });
      }
      
      return NextResponse.json(
        { error: 'Invalid response from Cloud Function', details: jsonError instanceof Error ? jsonError.message : 'Unknown error' },
        { status: 502 }
      );
    }
    
    // Generate public URL
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${destFileName}`;
    const signedUrl = result.signedUrl || '';
    console.log(`API route: Upload successful, public URL: ${publicUrl}`);
    
    // Try to verify the file exists in GCS
    try {
      console.log('API route: Verifying file exists in storage bucket...');
      // Give storage a moment to process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Use a no-cors request to avoid CORS issues
      const verification = await fetch(publicUrl, { 
        method: 'HEAD',
        mode: 'no-cors'
      });
      
      console.log('API route: Verification completed without error');
    } catch (verifyError) {
      console.warn('API route: Verification error, file may not be accessible:', verifyError);
      // Continue anyway and return the URL
    }
    
    return NextResponse.json({
      success: true,
      url: publicUrl,
      signedUrl: signedUrl,
      fileName: destFileName,
      cloudFunctionResponse: result
    });
  } catch (error: any) {
    console.error('API route: Error uploading to Google Cloud Storage:', error);
    
    // In development, provide a more helpful response
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json(
        { 
          error: 'Failed to upload file to Google Cloud Storage (Development mode)',
          details: error.message,
          suggestion: 'The cloud function may not be deployed yet. For development, the client-side code will fall back to local storage.'
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to upload file to Google Cloud Storage',
        details: error.message 
      },
      { status: 500 }
    );
  }
} 