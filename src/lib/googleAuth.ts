export interface AuthSession {
  accessToken: string;
  expiresAt: number;
}

let currentSession: AuthSession | null = null;
let globalClientId = '';
let globalScopes = '';

export function initGoogleAuth(clientId: string, scopes: string) {
  globalClientId = clientId;
  globalScopes = scopes;
}

export function getAccessToken(): string | null {
  if (currentSession && Date.now() < currentSession.expiresAt) {
    return currentSession.accessToken;
  }
  return null;
}

export async function requestAccessToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (currentSession && Date.now() < currentSession.expiresAt) {
      return resolve(currentSession.accessToken);
    }
    
    if (!globalClientId || !window.google) {
      return reject(new Error('Google Auth not initialized. Call initGoogleAuth first.'));
    }

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: globalClientId,
      scope: globalScopes,
      callback: (resp: any) => {
        if (resp.error !== undefined) {
          return reject(new Error(resp.error));
        }
        currentSession = {
          accessToken: resp.access_token,
          expiresAt: Date.now() + (parseInt(resp.expires_in, 10) - 60) * 1000
        };
        resolve(resp.access_token);
      }
    });

    client.requestAccessToken({ prompt: 'consent' });
  });
}
