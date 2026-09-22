import { z } from "zod";
import { readLocal, writeLocal } from "./local-storage";

const CLIENT_ID = "ea0616ba-638b-4df5-95b9-636659ae5121";
const LOGIN_URL = "/ms-login/organizations/oauth2/v2.0";
const SCOPE = "https://analysis.windows.net/powerbi/api/.default offline_access openid profile";
const SESSION_KEY = "pbi:session";

const sessionSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresAt: z.number(),
  username: z.string(),
});

type PbiSession = z.infer<typeof sessionSchema>;

export type DeviceLogin = {
  userCode: string;
  deviceCode: string;
  verificationUri: string;
  interval: number;
  expiresAt: number;
};

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  id_token?: string;
  error?: string;
  error_description?: string;
};

async function post<T>(endpoint: string, params: Record<string, string>) {
  const response = await fetch(`${LOGIN_URL}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: CLIENT_ID, ...params }),
  });
  return (await response.json()) as T;
}

function readSession() {
  const parsed = sessionSchema.safeParse(readLocal(SESSION_KEY, null));
  return parsed.success ? parsed.data : null;
}

function usernameFrom(token: string) {
  const payload = token.split(".")[1] ?? "";
  const claims = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as Record<string, string | undefined>;
  return claims.preferred_username ?? claims.upn ?? claims.unique_name ?? claims.name ?? "Power BI user";
}

function saveSession(tokens: TokenResponse, previous?: PbiSession): PbiSession {
  if (!tokens.access_token) {
    throw new Error(tokens.error_description?.split("\r\n")[0] ?? "Power BI sign-in failed.");
  }
  const session = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? previous?.refreshToken ?? "",
    expiresAt: Date.now() + (tokens.expires_in ?? 3600) * 1000,
    username: previous?.username ?? usernameFrom(tokens.id_token ?? tokens.access_token),
  };
  writeLocal(SESSION_KEY, session);
  return session;
}

export async function startDeviceLogin(): Promise<DeviceLogin> {
  const response = await post<{
    user_code?: string;
    device_code?: string;
    verification_uri?: string;
    interval?: number;
    expires_in?: number;
    error_description?: string;
  }>("devicecode", { scope: SCOPE });
  if (!response.device_code || !response.user_code) {
    throw new Error(response.error_description ?? "Could not start the Power BI sign-in.");
  }
  return {
    userCode: response.user_code,
    deviceCode: response.device_code,
    verificationUri: response.verification_uri ?? "https://microsoft.com/devicelogin",
    interval: response.interval ?? 5,
    expiresAt: Date.now() + (response.expires_in ?? 900) * 1000,
  };
}

export async function completeDeviceLogin(login: DeviceLogin, signal?: AbortSignal) {
  let interval = login.interval;
  while (Date.now() < login.expiresAt) {
    await new Promise((resolve) => setTimeout(resolve, interval * 1000));
    signal?.throwIfAborted();
    const tokens = await post<TokenResponse>("token", {
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      device_code: login.deviceCode,
    });
    if (tokens.error === "authorization_pending") continue;
    if (tokens.error === "slow_down") {
      interval += 5;
      continue;
    }
    return saveSession(tokens).username;
  }
  throw new Error("The sign-in code expired. Try again.");
}

let refreshing: Promise<PbiSession> | null = null;

function refreshSession(session: PbiSession) {
  refreshing ??= post<TokenResponse>("token", {
    grant_type: "refresh_token",
    refresh_token: session.refreshToken,
    scope: SCOPE,
  })
    .then((tokens) => saveSession(tokens, session))
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export async function getPbiAccount() {
  return readSession()?.username ?? null;
}

export async function signOutPbi() {
  writeLocal(SESSION_KEY, null);
}

export async function getPbiToken() {
  const session = readSession();
  if (!session) throw new Error("Not signed in to Power BI. Go to Settings.");
  if (session.expiresAt - Date.now() > 5 * 60_000) return session.accessToken;
  try {
    return (await refreshSession(session)).accessToken;
  } catch {
    await signOutPbi();
    throw new Error("Power BI session expired. Sign in again in Settings.");
  }
}
