import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test route working',
      receivedEmail: email 
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Test route error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    success: true, 
    message: 'Test route GET working' 
  });
} 