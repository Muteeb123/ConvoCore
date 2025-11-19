/**
 * Small helper service for exchanging Google OAuth codes and fetching
 * Google user profile information. All methods are static so callers
 * can use `GoogleAuthService.method(...)` without instantiating.
 */
import { GOOGLE_OAUTH_CONFIG } from '../config/google-oauth.js';

/**
 * Minimal shape of the token response returned by Google's token endpoint.
 */
interface GoogleTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}
/**
 * Minimal shape of the Google userinfo response used by the application.
 */
interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
}

export class GoogleAuthService {
  /**
   * Exchange an authorization `code` (from the OAuth redirect) for an
   * access token. Returns the parsed token response on success.
   * @param code - Authorization code returned by Google's OAuth flow
   */
  static async exchangeCodeForToken(code: string): Promise<GoogleTokenResponse> {
    try {
      const response = await fetch(GOOGLE_OAUTH_CONFIG.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: GOOGLE_OAUTH_CONFIG.clientId,
          client_secret: GOOGLE_OAUTH_CONFIG.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: GOOGLE_OAUTH_CONFIG.redirectUri,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to exchange code for token: ${error}`);
      }

      // Cast to the expected minimal shape. Caller may validate further.
      return (await response.json()) as GoogleTokenResponse;
    } catch (err) {
      // Provide a clearer stack for callers
      throw new Error(`GoogleAuthService.exchangeCodeForToken failed: ${(err as Error).message}`);
    }
  }

  static async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    /**
     * Retrieve the user's profile from Google's userinfo endpoint using
     * an OAuth access token.
     * @param accessToken - Bearer token obtained from token exchange
     */
    try {
      const response = await fetch(GOOGLE_OAUTH_CONFIG.userInfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to get user info: ${error}`);
      }

      return (await response.json()) as GoogleUserInfo;
    } catch (err) {
      throw new Error(`GoogleAuthService.getUserInfo failed: ${(err as Error).message}`);
    }
  }

  static async authenticateUser(code: string): Promise<{
    userInfo: GoogleUserInfo;
    accessToken: string;
  }> {
    /**
     * Convenience flow that exchanges an authorization `code` for an
     * access token and immediately fetches the Google profile. Returns
     * both the profile and the raw access token.
     * @param code - Authorization code from OAuth redirect
     */
    const tokenResponse = await this.exchangeCodeForToken(code);
    const userInfo = await this.getUserInfo(tokenResponse.access_token);

    return {
      userInfo,
      accessToken: tokenResponse.access_token,
    };
  }
} 