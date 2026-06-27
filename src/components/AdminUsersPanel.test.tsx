import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminUsersPanel } from './AdminUsersPanel';

describe('AdminUsersPanel', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads users and patches role/status changes through the server API', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([{ id: 'u1', username: 'reader', displayName: '열람자', role: 'viewer', isActive: true }]),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ id: 'u1', username: 'reader', displayName: '열람자', role: 'editor', isActive: true }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ id: 'u1', username: 'reader', displayName: '열람자', role: 'editor', isActive: false }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    render(<AdminUsersPanel apiBaseUrl="http://localhost:8000/api" authToken="admin-token" />);

    const row = (await screen.findByText('열람자')).closest('.admin-users-table__row');
    expect(row).not.toBeNull();

    const rowScope = within(row as HTMLElement);
    fireEvent.change(rowScope.getByLabelText('권한'), { target: { value: 'editor' } });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('http://localhost:8000/api/admin/users/u1', {
        method: 'PATCH',
        headers: { Authorization: 'Bearer admin-token', 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'editor' }),
      });
    });

    fireEvent.click(rowScope.getByLabelText('활성'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith('http://localhost:8000/api/admin/users/u1', {
        method: 'PATCH',
        headers: { Authorization: 'Bearer admin-token', 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      });
    });
  });

  it('creates users through the server API', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ id: 'u2', username: 'writer', displayName: '편집자', role: 'editor', isActive: true }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    render(<AdminUsersPanel apiBaseUrl="http://localhost:8000/api" authToken="admin-token" />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'writer' } });
    fireEvent.change(screen.getByLabelText('표시 이름'), { target: { value: '편집자' } });
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password-1' } });
    fireEvent.change(screen.getByLabelText('권한'), { target: { value: 'editor' } });
    fireEvent.click(screen.getByRole('button', { name: '사용자 추가' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith('http://localhost:8000/api/admin/users', {
        method: 'POST',
        headers: { Authorization: 'Bearer admin-token', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'writer',
          password: 'password-1',
          displayName: '편집자',
          role: 'editor',
          isActive: true,
        }),
      });
    });
    expect(await screen.findByText('writer')).toBeTruthy();
  });

  it('shows an explicit empty state when no server users are returned', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    render(<AdminUsersPanel apiBaseUrl="http://localhost:8000/api" authToken="admin-token" />);

    expect(await screen.findByText('등록된 사용자가 없습니다.')).toBeTruthy();
    expect(await screen.findByText('접수된 회원가입 신청이 없습니다.')).toBeTruthy();
  });

  it('shows access requests and updates request status through the server API', async () => {
    const accessRequest = {
      id: 'r1',
      requestedUsername: 'researcher',
      displayName: '신청자',
      department: '연구기획팀',
      email: 'researcher@example.com',
      reason: '보고서 작성 권한 필요',
      status: 'pending',
      createdAt: '2026-06-27T00:00:00Z',
      updatedAt: '2026-06-27T00:00:00Z',
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify([accessRequest]), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ...accessRequest, status: 'approved' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([{ id: 'u1', username: 'researcher', displayName: '신청자', role: 'viewer', isActive: true }]),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    render(<AdminUsersPanel apiBaseUrl="http://localhost:8000/api" authToken="admin-token" />);

    expect(await screen.findByText('신청자')).toBeTruthy();
    const requestRow = (await screen.findByText('신청자')).closest('.admin-access-request-row');
    expect(requestRow).not.toBeNull();
    fireEvent.click(within(requestRow as HTMLElement).getByRole('button', { name: '승인' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(3, 'http://localhost:8000/api/admin/access-requests/r1', {
        method: 'PATCH',
        headers: { Authorization: 'Bearer admin-token', 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });
    });
    expect(await screen.findByText('회원가입을 승인하고 사용자 계정을 활성화했습니다.')).toBeTruthy();
  });
});
