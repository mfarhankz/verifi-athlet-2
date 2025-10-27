import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check if required environment variables are set
    const privateKeyPem = process.env.CF_PRIVATE_KEY_PEM;
    const keyPairId = process.env.CF_KEY_PAIR_ID;
    const cloudFrontDomain = process.env.CF_DOMAIN;

    const config = {
      hasPrivateKey: !!privateKeyPem,
      hasKeyPairId: !!keyPairId,
      hasDomain: !!cloudFrontDomain,
      privateKeyLength: privateKeyPem?.length || 0,
      keyPairId: keyPairId || 'Not set',
      domain: cloudFrontDomain || 'Not set',
    };

    return NextResponse.json({
      success: true,
      message: 'CloudFront configuration check',
      config,
      supportedDomains: [
        cloudFrontDomain || 'Not configured',
        'video.verifiedathletics.com (custom vanity URL)'
      ],
      instructions: {
        setup: [
          '1. Set CF_PRIVATE_KEY_PEM in your Vercel environment variables',
          '2. Set CF_KEY_PAIR_ID in your Vercel environment variables', 
          '3. Set CF_DOMAIN in your Vercel environment variables',
          '4. The private key should be the full PEM content including headers',
          '5. Custom vanity URL (video.verifiedathletics.com) is automatically supported'
        ],
        example: {
          CF_PRIVATE_KEY_PEM: '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----',
          CF_KEY_PAIR_ID: 'APKAIOSFODNN7EXAMPLE',
          CF_DOMAIN: 'd1234567890.cloudfront.net'
        }
      }
    });

  } catch (error: any) {
    return NextResponse.json(
      { 
        error: 'Configuration check failed',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
