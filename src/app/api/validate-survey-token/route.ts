import { NextRequest, NextResponse } from 'next/server';
import { validateSurveyToken } from '../../../lib/surveyTokenService';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ 
        error: 'Token is required' 
      }, { status: 400 });
    }

    // Validate the token
    const result = await validateSurveyToken(token);

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error || 'Invalid token' 
      }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      athlete_id: result.athlete_id
    });

  } catch (error) {
    console.error('Error validating survey token:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
