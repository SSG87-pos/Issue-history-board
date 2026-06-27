import type { IssueBoardData } from './types';

export type UserRole = 'admin' | 'editor' | 'viewer';

export type CurrentUser = {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
};

export type AuthSession = {
  accessToken: string;
  user: CurrentUser;
};

export type AccessRequestStatus = 'pending' | 'approved' | 'rejected';

export type NewAccessRequest = {
  requestedUsername: string;
  displayName: string;
  department: string;
  email: string;
  password: string;
  reason: string;
};

export type AccessRequestRecord = Omit<NewAccessRequest, 'password'> & {
  id: string;
  status: AccessRequestStatus;
  createdAt: string;
  updatedAt: string;
};

export type NewServerUser = {
  username: string;
  password: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
};

export type ServerUserUpdate = {
  password?: string;
  displayName?: string;
  role?: UserRole;
  isActive?: boolean;
};

type ViteEnv = Record<string, string | undefined>;

export function getServerApiBaseUrl(env: ViteEnv = import.meta.env): string | undefined {
  const configured = env.VITE_API_BASE_URL?.trim();
  if (!configured) return undefined;
  return configured.replace(/\/+$/, '');
}

export async function loginToServer(baseUrl: string, username: string, password: string): Promise<AuthSession> {
  return requestJson<AuthSession>(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
}

export async function fetchCurrentUser(baseUrl: string, token: string): Promise<CurrentUser> {
  return requestJson<CurrentUser>(`${baseUrl}/auth/me`, {
    headers: authHeaders(token),
  });
}

export async function submitAccessRequest(baseUrl: string, request: NewAccessRequest): Promise<AccessRequestRecord> {
  return requestJson<AccessRequestRecord>(`${baseUrl}/access-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
}

export async function fetchBoardData(baseUrl: string, token: string): Promise<IssueBoardData> {
  return requestJson<IssueBoardData>(`${baseUrl}/board`, {
    headers: authHeaders(token),
  });
}

export async function saveBoardDataToServer(baseUrl: string, token: string, data: IssueBoardData): Promise<void> {
  const response = await fetch(`${baseUrl}/board`, {
    method: 'PUT',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response));
  }
}

export async function listServerUsers(baseUrl: string, token: string): Promise<CurrentUser[]> {
  return requestJson<CurrentUser[]>(`${baseUrl}/admin/users`, {
    headers: authHeaders(token),
  });
}

export async function listAccessRequests(baseUrl: string, token: string): Promise<AccessRequestRecord[]> {
  return requestJson<AccessRequestRecord[]>(`${baseUrl}/admin/access-requests`, {
    headers: authHeaders(token),
  });
}

export async function updateAccessRequestStatus(
  baseUrl: string,
  token: string,
  requestId: string,
  status: AccessRequestStatus,
): Promise<AccessRequestRecord> {
  return requestJson<AccessRequestRecord>(`${baseUrl}/admin/access-requests/${encodeURIComponent(requestId)}`, {
    method: 'PATCH',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

export async function createServerUser(baseUrl: string, token: string, user: NewServerUser): Promise<CurrentUser> {
  return requestJson<CurrentUser>(`${baseUrl}/admin/users`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });
}

export async function updateServerUser(
  baseUrl: string,
  token: string,
  userId: string,
  user: ServerUserUpdate,
): Promise<CurrentUser> {
  return requestJson<CurrentUser>(`${baseUrl}/admin/users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response));
  }
  return response.json() as Promise<T>;
}

async function getApiErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { detail?: string };
    return data.detail ?? `Server request failed: ${response.status}`;
  } catch {
    return `Server request failed: ${response.status}`;
  }
}
