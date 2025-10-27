import { NextRequest, NextResponse } from 'next/server';
import { CloudFrontClient } from '@aws-sdk/client-cloudfront';
import { getSignedUrl } from '@aws-sdk/cloudfront-signer';

export async function POST(request: NextRequest) {
  try {
    const { videoUrl } = await request.json();

    if (!videoUrl) {
      return NextResponse.json(
        { error: 'Video URL is required' },
        { status: 400 }
      );
    }

    // Get the CloudFront private key from environment variables
    const privateKeyPem = process.env.CF_PRIVATE_KEY_PEM;
    const keyPairId = process.env.CF_KEY_PAIR_ID; // You'll need to add this to your Vercel environment variables
    const cloudFrontDomain = process.env.CF_DOMAIN; // Your CloudFront domain

    if (!privateKeyPem || !keyPairId || !cloudFrontDomain) {
      return NextResponse.json(
        { error: 'CloudFront configuration is missing. Please check environment variables.' },
        { status: 500 }
      );
    }

    // Extract the path from the video URL
    // Handle both CloudFront domain and custom vanity URL
    let videoPath = videoUrl;
    let targetDomain = cloudFrontDomain;
    
    if (videoUrl.includes(cloudFrontDomain)) {
      videoPath = videoUrl.split(cloudFrontDomain)[1];
    } else if (videoUrl.includes('video.verifiedathletics.com')) {
      // Handle custom vanity URL
      videoPath = videoUrl.split('video.verifiedathletics.com')[1];
      targetDomain = 'video.verifiedathletics.com';
    } else if (videoUrl.startsWith('/')) {
      // If it's already a path, use it as is
      videoPath = videoUrl;
    } else {
      // If it's a full URL from a different domain, we can't sign it
      return NextResponse.json(
        { error: 'Video URL must be from the configured CloudFront domain or custom vanity URL' },
        { status: 400 }
      );
    }

    // Generate signed URL with 1 hour expiration
    const expirationTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    const signedUrl = getSignedUrl({
      url: `https://${targetDomain}${videoPath}`,
      keyPairId: keyPairId,
      privateKey: privateKeyPem,
      dateLessThan: expirationTime.toISOString(),
    });

    return NextResponse.json({
      success: true,
      signedUrl: signedUrl,
      expiresAt: expirationTime.toISOString(),
    });

  } catch (error: any) {
    console.error('Error generating CloudFront signed URL:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate signed URL',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
