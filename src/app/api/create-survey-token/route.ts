import { NextRequest, NextResponse } from 'next/server';
import { createSurveyToken } from '../../../lib/surveyTokenService';

export async function POST(request: NextRequest) {
  try {
    const { athleteId, expiresInDays = 365 } = await request.json();

    if (!athleteId) {
      return NextResponse.json({ 
        error: 'Athlete ID is required' 
      }, { status: 400 });
    }

    // Create the survey token
    const result = await createSurveyToken(athleteId, expiresInDays);

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error || 'Failed to create token' 
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      token: result.token,
      message: 'Survey token created successfully'
    });

  } catch (error) {
    console.error('Error creating survey token:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
