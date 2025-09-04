import { supabase, supabaseAdmin } from './supabaseClient';
import crypto from 'crypto';

export interface SurveyToken {
  id: string;
  athlete_id: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
  used_at: string | null;
  is_active: boolean;
}

export interface CreateTokenResult {
  success: boolean;
  token?: string;
  error?: string;
}

export interface ValidateTokenResult {
  success: boolean;
  athlete_id?: string;
  error?: string;
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a token for secure storage
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Create a survey token for an athlete
 * This should only be called by authenticated users (admins)
 */
export async function createSurveyToken(
  athleteId: string, 
  expiresInDays: number = 365
): Promise<CreateTokenResult> {
  try {
    // Verify the athlete exists
    const { data: athlete, error: athleteError } = await supabaseAdmin
      .from('athlete')
      .select('id')
      .eq('id', athleteId)
      .single();

    if (athleteError || !athlete) {
      return {
        success: false,
        error: 'Athlete not found'
      };
    }

    // Generate a secure token
    const token = generateSecureToken();
    const tokenHash = hashToken(token);

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Store the token hash in the database
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('survey_tokens')
      .insert({
        athlete_id: athleteId,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
        is_active: true
      })
      .select()
      .single();

    if (tokenError) {
      console.error('Error creating survey token:', tokenError);
      return {
        success: false,
        error: 'Failed to create survey token'
      };
    }

    return {
      success: true,
      token: token // Return the plain token (not the hash)
    };
  } catch (error) {
    console.error('Error in createSurveyToken:', error);
    return {
      success: false,
      error: 'Internal server error'
    };
  }
}

/**
 * Validate a survey token and return the associated athlete ID
 */
export async function validateSurveyToken(token: string): Promise<ValidateTokenResult> {
  try {
    const tokenHash = hashToken(token);

    // Look up the token in the database
    const { data: tokenData, error: tokenError } = await supabase
      .from('survey_tokens')
      .select('*')
      .eq('token_hash', tokenHash)
      .eq('is_active', true)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (tokenError || !tokenData) {
      return {
        success: false,
        error: 'Invalid or expired token'
      };
    }

    return {
      success: true,
      athlete_id: tokenData.athlete_id
    };
  } catch (error) {
    console.error('Error in validateSurveyToken:', error);
    return {
      success: false,
      error: 'Internal server error'
    };
  }
}

/**
 * Mark a survey token as used
 */
export async function markTokenAsUsed(token: string): Promise<boolean> {
  try {
    const tokenHash = hashToken(token);

    const { error } = await supabaseAdmin
      .from('survey_tokens')
      .update({
        used_at: new Date().toISOString()
      })
      .eq('token_hash', tokenHash)
      .eq('is_active', true)
      .is('used_at', null);

    if (error) {
      console.error('Error marking token as used:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in markTokenAsUsed:', error);
    return false;
  }
}

/**
 * Deactivate a survey token
 */
export async function deactivateSurveyToken(token: string): Promise<boolean> {
  try {
    const tokenHash = hashToken(token);

    const { error } = await supabaseAdmin
      .from('survey_tokens')
      .update({
        is_active: false
      })
      .eq('token_hash', tokenHash);

    if (error) {
      console.error('Error deactivating token:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deactivateSurveyToken:', error);
    return false;
  }
}

/**
 * Get all active tokens for an athlete
 */
export async function getAthleteTokens(athleteId: string): Promise<SurveyToken[]> {
  try {
    const { data: tokens, error } = await supabaseAdmin
      .from('survey_tokens')
      .select('*')
      .eq('athlete_id', athleteId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching athlete tokens:', error);
      return [];
    }

    return tokens || [];
  } catch (error) {
    console.error('Error in getAthleteTokens:', error);
    return [];
  }
}

/**
 * Clean up expired tokens
 */
export async function cleanupExpiredTokens(): Promise<number> {
  try {
    const { data, error } = await supabaseAdmin
      .from('survey_tokens')
      .update({
        is_active: false
      })
      .lt('expires_at', new Date().toISOString())
      .eq('is_active', true);

    if (error) {
      console.error('Error cleaning up expired tokens:', error);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    console.error('Error in cleanupExpiredTokens:', error);
    return 0;
  }
}
