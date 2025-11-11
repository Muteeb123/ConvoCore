// Google OAuth configuration - use server endpoint to avoid VITE_ env var issues
export const GOOGLE_AUTH_URL = '/api/auth/google'; // Server endpoint to get auth URL

export const buildGoogleAuthUrl = (state?: string) => {
  // Use server endpoint instead of building URL directly
  return `${GOOGLE_AUTH_URL}?state=${state || ''}`;
}; 