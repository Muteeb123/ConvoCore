import { GOOGLE_OAUTH_CONFIG } from '../config/google-oauth.js';

interface GoogleTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

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
  static async exchangeCodeForToken(code: string): Promise<GoogleTokenResponse> {
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

    return response.json();
  }

  static async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    const response = await fetch(GOOGLE_OAUTH_CONFIG.userInfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get user info: ${error}`);
    }

    return response.json();
  }

  static async authenticateUser(code: string): Promise<{
    userInfo: GoogleUserInfo;
    accessToken: string;
  }> {
    // Exchange authorization code for access token
    const tokenResponse = await this.exchangeCodeForToken(code);
    
    // Get user information using the access token
    const userInfo = await this.getUserInfo(tokenResponse.access_token);

    return {
      userInfo,
      accessToken: tokenResponse.access_token,
    };
  }
} 