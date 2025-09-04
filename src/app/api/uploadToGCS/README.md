# PDF Upload to Google Cloud Storage

This directory contains both a Next.js API route (`route.ts`) and a reference implementation of a Google Cloud Function (`gcs-upload-function.js`) for uploading PDF files to Google Cloud Storage.

## Development Environment

### Current Status
The cloud function is **not currently deployed**. The file upload functionality is configured to work in development mode by:

1. The client tries to use the Next.js API route.
2. The API route detects it's in development and returns a mock success response.
3. If the API route fails, the client falls back to a local ObjectURL for direct download.

### Development Workflow
During development:
- Files are only uploaded locally and provided as a direct download link
- A 1MB file size limit is enforced to match production constraints
- Mock responses simulate success even if the cloud function isn't deployed

## Production Environment

In production, the application will:
1. Try the Next.js API route first
2. Fall back to direct Cloud Function calls if needed

## Handling Large Files

There are several size limits to be aware of:

- **Cloud Function Request Limit**: 1MB for HTTP-triggered functions as configured
- **API Route Limit**: Next.js API routes are configured with a 1MB limit
- **PDF Generation**: For large or complex maps, file size is reduced by:
  - Using JPEG instead of PNG
  - Reducing canvas scale from 2.0 to 1.5 or 1.0
  - Using JPEG compression (quality 0.7 or 0.5)
  - Enabling PDF compression

If a file is too large for upload, the application will:
1. Attempt to further reduce the PDF size
2. If still too large, offer direct download to the user

## Deploying the Cloud Function

Before the application can upload to Google Cloud Storage in production, you need to:

1. **Install Google Cloud SDK**:
   ```
   https://cloud.google.com/sdk/docs/install
   ```

2. **Login to gcloud CLI**:
   ```
   gcloud auth login
   ```

3. **Set the project**:
   ```
   gcloud config set project verified-312021
   ```

4. **Deploy the function from the `gcs-upload-function.js` file**:
   ```
   gcloud functions deploy uploadPDF \
     --runtime nodejs18 \
     --trigger-http \
     --allow-unauthenticated \
     --region us-central1 \
     --max-instances 10 \
     --memory 256MB \
     --timeout 60s
   ```

5. **Set proper IAM permissions** for the function's service account to write to the `excel-to-pdf-output-bucket` bucket.

## Testing Your Deployment

After deploying the cloud function, you can test it with:

```
curl -X POST https://us-central1-verified-312021.cloudfunctions.net/uploadPDF \
  -H "Content-Type: application/json" \
  -d '{"filename":"test.txt","contentType":"text/plain","destination":"test.txt","bucket":"excel-to-pdf-output-bucket","base64Data":"aGVsbG8gd29ybGQ="}'
```

The response should include a success status and a URL to the uploaded file.

## Function URL

Once deployed, the Cloud Function will be available at:
https://us-central1-verified-312021.cloudfunctions.net/uploadPDF

## Troubleshooting

- **404 Not Found**: This indicates the cloud function hasn't been deployed yet.
- **CORS Issues**: The Cloud Function includes CORS headers to allow requests from any origin.
- **File Size Limits**: The application is configured with a 1MB file size limit to avoid timeouts.
- **Authentication**: For security, consider adding authentication to the Cloud Function.
- **Timeouts**: If uploads time out, try reducing the PDF quality further or increase the Cloud Function timeout.
- **Bandwidth**: In some environments, large uploads may fail due to network issues. The application includes fallback to direct download. 