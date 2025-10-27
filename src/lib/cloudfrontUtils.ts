/**
 * Utility functions for CloudFront signed URL generation
 */

export interface SignedUrlResponse {
  success: boolean;
  signedUrl?: string;
  expiresAt?: string;
  error?: string;
}

/**
 * Generate a CloudFront signed URL for a video
 * @param videoUrl - The original video URL
 * @returns Promise with signed URL or error
 */
export async function generateSignedUrl(videoUrl: string): Promise<SignedUrlResponse> {
  try {
    const response = await fetch('/api/cloudfront-signed-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ videoUrl }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to generate signed URL',
      };
    }

    return {
      success: true,
      signedUrl: data.signedUrl,
      expiresAt: data.expiresAt,
    };
  } catch (error: any) {
    console.error('Error generating signed URL:', error);
    return {
      success: false,
      error: error.message || 'Network error while generating signed URL',
    };
  }
}

/**
 * Check if a URL is from CloudFront and needs signing
 * @param url - The URL to check
 * @returns boolean indicating if the URL needs signing
 */
export function needsSigning(url: string): boolean {
  // Check if it's a CloudFront URL that needs signing
  // Since this runs on the client side, we'll check for common CloudFront patterns
  // and let the server-side API handle the actual domain validation
  
  console.log('🔍 needsSigning check:', { url });
  
  // Check for CloudFront domain patterns (both default and custom vanity URL)
  const isCloudFrontUrl = url.includes('.cloudfront.net') || 
                         url.includes('video.verifiedathletics.com') || 
                         url.startsWith('/');
  
  console.log(`🔑 URL "${url}" needs signing: ${isCloudFrontUrl}`);
  return isCloudFrontUrl;
}

/**
 * Cache for signed URLs to avoid regenerating them unnecessarily
 */
const signedUrlCache = new Map<string, { url: string; expiresAt: string }>();

/**
 * Get a signed URL with caching
 * @param videoUrl - The original video URL
 * @returns Promise with signed URL
 */
export async function getCachedSignedUrl(videoUrl: string): Promise<string> {
  // Check cache first
  const cached = signedUrlCache.get(videoUrl);
  if (cached) {
    const expiresAt = new Date(cached.expiresAt);
    const now = new Date();
    
    // If expires in more than 5 minutes, use cached URL
    if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
      return cached.url;
    }
    
    // Remove expired entry
    signedUrlCache.delete(videoUrl);
  }

  // Generate new signed URL
  const result = await generateSignedUrl(videoUrl);
  
  if (result.success && result.signedUrl && result.expiresAt) {
    // Cache the result
    signedUrlCache.set(videoUrl, {
      url: result.signedUrl,
      expiresAt: result.expiresAt,
    });
    
    return result.signedUrl;
  }

  // If signing fails, return original URL as fallback
  console.warn('Failed to generate signed URL, using original URL:', result.error);
  return videoUrl;
}
