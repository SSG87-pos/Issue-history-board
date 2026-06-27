import { afterEach, describe, expect, it, vi } from 'vitest';
import { seedData } from './seedData';
import {
  fetchBoardData,
  fetchCurrentUser,
  getServerApiBaseUrl,
  listServerUsers,
  loginToServer,
  createServerUser,
  saveBoardDataToServer,
  updateServerUser,
} from './serverApi';

describe('server API client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('normalizes the configured server API base URL', () => {
    expect(getServerApiBaseUrl({ VITE_API_BASE_URL: ' http://localhost:8000/api/ ' })).toBe(
      'http://localhost:8000/api',
    );
    expect(getServerApiBaseUrl({ VITE_API_BASE_URL: '   ' })).toBeUndefined();
  });

  it('logs in with JSON credentials and returns the issued session', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: 'token-1',
          user: { id: 'u1', username: 'admin', displayName: '관리자', role: 'admin', isActive: true },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const session = await loginToServer('http://localhost:8000/api', 'admin', 'secret');

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'secret' }),
    });
    expect(session.user.role).toBe('admin');
    expect(session.accessToken).toBe('token-1');
  });

  it('sends bearer tokens when loading and saving board data', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(seedData), { status: 200, headers: { 'Content-Type': 'application/json' } }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    const loaded = await fetchBoardData('http://localhost:8000/api', 'token-1');
    await saveBoardDataToServer('http://localhost:8000/api', 'token-1', loaded);

    expect(fetchMock).toHaveBeenNthCalledWith(1, 'http://localhost:8000/api/board', {
      headers: { Authorization: 'Bearer token-1' },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'http://localhost:8000/api/board', {
      method: 'PUT',
      headers: { Authorization: 'Bearer token-1', 'Content-Type': 'application/json' },
      body: JSON.stringify(seedData),
    });
  });

  it('loads the current user from the saved token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ id: 'u2', username: 'reader', displayName: '열람자', role: 'viewer', isActive: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const user = await fetchCurrentUser('http://localhost:8000/api', 'token-2');

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8000/api/auth/me', {
      headers: { Authorization: 'Bearer token-2' },
    });
    expect(user.role).toBe('viewer');
  });

  it('uses admin endpoints to list and create users', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([{ id: 'u1', username: 'admin', displayName: '관리자', role: 'admin', isActive: true }]),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ id: 'u2', username: 'reader', displayName: '열람자', role: 'viewer', isActive: true }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    await listServerUsers('http://localhost:8000/api', 'admin-token');
    await createServerUser('http://localhost:8000/api', 'admin-token', {
      username: 'reader',
      password: 'password-1',
      displayName: '열람자',
      role: 'viewer',
      isActive: true,
    });

    expect(fetchMock).toHaveBeenNthCalledWith(1, 'http://localhost:8000/api/admin/users', {
      headers: { Authorization: 'Bearer admin-token' },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'http://localhost:8000/api/admin/users', {
      method: 'POST',
      headers: { Authorization: 'Bearer admin-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'reader',
        password: 'password-1',
        displayName: '열람자',
        role: 'viewer',
        isActive: true,
      }),
    });
  });

  it('uses the admin endpoint to update user role, active status, and password', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ id: 'u2', username: 'reader', displayName: '열람자', role: 'editor', isActive: false }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const user = await updateServerUser('http://localhost:8000/api', 'admin-token', 'u2', {
      role: 'editor',
      isActive: false,
      password: 'new-password-1',
    });

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8000/api/admin/users/u2', {
      method: 'PATCH',
      headers: { Authorization: 'Bearer admin-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'editor',
        isActive: false,
        password: 'new-password-1',
      }),
    });
    expect(user.role).toBe('editor');
    expect(user.isActive).toBe(false);
  });
});
