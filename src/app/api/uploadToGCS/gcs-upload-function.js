/**
 * Cloud Function to handle PDF uploads to Google Cloud Storage
 * Deploy this function to: https://us-central1-verified-312021.cloudfunctions.net/uploadPDF
 */

import { Storage } from '@google-cloud/storage';

// Initialize storage client (will use the default credentials when deployed as Cloud Function)
const storage = new Storage();

/**
 * HTTP Cloud Function to handle PDF uploads
 * @param {Object} req The request object
 * @param {Object} res The response object
 */
export const uploadPDF = async (req, res) => {
  // Set CORS headers for preflight requests
  // Allows requests from any origin
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Max-Age', '3600');
  
  if (req.method === 'OPTIONS') {
    // Handle preflight request
    return res.status(204).send('');
  }
  
  // Handle simple HEAD requests for file verification
  if (req.method === 'HEAD') {
    return res.status(200).send('OK');
  }
  
  // Handle minimal test requests
  if (req.method === 'POST' && req.body && req.body.test === true) {
    return res.status(200).json({ status: 'ok', message: 'Test request successful' });
  }
  
  try {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }
    
    const { filename, contentType, destination, bucket, base64Data } = req.body;
    
    // Log received parameters (without the base64 data for brevity)
    console.log('Cloud Function received upload request:', {
      filename,
      contentType,
      destination,
      bucket,
      base64Length: base64Data ? base64Data.length : 0
    });
    
    if (!filename || !base64Data || !bucket) {
      return res.status(400).send('Missing required fields: filename, base64Data, and bucket');
    }
    
    // Create a buffer from the base64 string
    const fileBuffer = Buffer.from(base64Data, 'base64');
    
    // Get the bucket reference
    const bucketRef = storage.bucket(bucket);
    
    // Create the file path - use destination if provided, otherwise just use filename
    const filePath = destination || filename;
    
    // Upload the file
    const file = bucketRef.file(filePath);
    console.log(`Cloud Function: Uploading file to ${bucket}/${filePath}`);
    
    try {
      await file.save(fileBuffer, {
        metadata: {
          contentType: contentType || 'application/pdf'
        },
        resumable: false
      });
      console.log(`Cloud Function: File uploaded successfully to ${bucket}/${filePath}`);
    } catch (saveError) {
      console.error('Cloud Function: Error saving file:', saveError);
      return res.status(500).send(`Error saving file: ${saveError.message}`);
    }
    
    // Try to make the file publicly accessible, handle gracefully if it fails due to uniform bucket access
    try {
      await file.makePublic();
      console.log('Cloud Function: File made public');
    } catch (aclError) {
      console.warn('Cloud Function: Could not set public ACL, using signed URL instead:', aclError.message);
      // Continue without error since the file was uploaded successfully
    }
    
    // Generate the public URL
    const publicUrl = `https://storage.googleapis.com/${bucket}/${filePath}`;
    
    // Generate a signed URL as backup in case public access fails
    let signedUrl = '';
    try {
      const [url] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      });
      signedUrl = url;
      console.log('Cloud Function: Generated signed URL as backup');
    } catch (signedUrlError) {
      console.warn('Cloud Function: Could not generate signed URL:', signedUrlError.message);
    }
    
    res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      url: publicUrl,
      signedUrl: signedUrl || '', // Include signed URL as backup
      filePath: filePath
    });
  } catch (error) {
    console.error('Cloud Function: Error uploading file:', error);
    res.status(500).send(`Error uploading file: ${error.message}`);
  }
}; 