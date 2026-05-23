export interface AuthSession {
  accessToken: string;
  expiresAt: number;
}

const LS_SESSION_KEY = 'tycodes_auth_session';

let currentSession: AuthSession | null = null;
try {
  const stored = localStorage.getItem(LS_SESSION_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    if (Date.now() < parsed.expiresAt) {
      currentSession = parsed;
    } else {
      localStorage.removeItem(LS_SESSION_KEY);
    }
  }
} catch {
  // ignore
}
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

export function clearAuthSession() {
  currentSession = null;
  localStorage.removeItem(LS_SESSION_KEY);
}

/** Polls until window.google is available (GIS script loaded) or times out. */
function waitForGoogleScript(timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve();
    const start = Date.now();
    const interval = setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        clearInterval(interval);
        resolve();
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        reject(new Error('Google Identity Services script failed to load. Check your network connection and that accounts.google.com is reachable.'));
      }
    }, 100);
  });
}

export async function requestAccessToken(): Promise<string> {
  if (currentSession && Date.now() < currentSession.expiresAt) {
    return currentSession.accessToken;
  }

  if (!globalClientId) {
    throw new Error('Google Auth not initialized. Call initGoogleAuth first.');
  }

  await waitForGoogleScript();

  return new Promise((resolve, reject) => {

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
        localStorage.setItem(LS_SESSION_KEY, JSON.stringify(currentSession));
        resolve(resp.access_token);
      }
    });

    client.requestAccessToken({ prompt: 'consent' });
  });
}
