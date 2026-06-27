import { FormEvent, useEffect, useState } from 'react';
import type { AccessRequestRecord, AccessRequestStatus, CurrentUser, NewServerUser, ServerUserUpdate, UserRole } from '../domain/serverApi';
import { createServerUser, listAccessRequests, listServerUsers, updateAccessRequestStatus, updateServerUser } from '../domain/serverApi';

type AdminUsersPanelProps = {
  apiBaseUrl?: string;
  authToken?: string;
};

const ROLE_LABELS: Record<UserRole, string> = {
  admin: '관리자',
  editor: '편집자',
  viewer: '조회자',
};

const REQUEST_STATUS_LABELS: Record<AccessRequestStatus, string> = {
  pending: '대기',
  approved: '승인',
  rejected: '반려',
};

const REQUEST_STATUS_OPTIONS: AccessRequestStatus[] = ['pending', 'approved', 'rejected'];

const INITIAL_FORM: NewServerUser = {
  username: '',
  password: '',
  displayName: '',
  role: 'viewer',
  isActive: true,
};

export function AdminUsersPanel({ apiBaseUrl, authToken }: AdminUsersPanelProps) {
  const [users, setUsers] = useState<CurrentUser[]>([]);
  const [accessRequests, setAccessRequests] = useState<AccessRequestRecord[]>([]);
  const [form, setForm] = useState<NewServerUser>(INITIAL_FORM);
  const [passwordResets, setPasswordResets] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedUsers, setHasLoadedUsers] = useState(false);
  const [message, setMessage] = useState<string | undefined>();

  useEffect(() => {
    if (!apiBaseUrl || !authToken) return;
    let cancelled = false;

    async function loadUsers() {
      try {
        setIsLoading(true);
        const [serverUsers, serverRequests] = await Promise.all([
          listServerUsers(apiBaseUrl!, authToken!),
          listAccessRequests(apiBaseUrl!, authToken!),
        ]);
        if (!cancelled) {
          setUsers(serverUsers);
          setAccessRequests(serverRequests);
          setHasLoadedUsers(true);
        }
      } catch (error) {
        if (!cancelled) setMessage(error instanceof Error ? error.message : '사용자 목록을 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadUsers();

    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, authToken]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!apiBaseUrl || !authToken) return;

    try {
      setIsLoading(true);
      setMessage(undefined);
      const created = await createServerUser(apiBaseUrl, authToken, form);
      setUsers((current) => [...current, created]);
      setForm(INITIAL_FORM);
      setMessage('사용자를 추가했습니다.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '사용자를 추가하지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUpdateUser(user: CurrentUser, update: ServerUserUpdate) {
    if (!apiBaseUrl || !authToken) return;

    try {
      setIsLoading(true);
      setMessage(undefined);
      const updated = await updateServerUser(apiBaseUrl, authToken, user.id, update);
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setMessage('사용자 권한을 저장했습니다.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '사용자 권한을 저장하지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePasswordReset(user: CurrentUser) {
    const password = passwordResets[user.id]?.trim();
    if (!password || password.length < 8) {
      setMessage('비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    await handleUpdateUser(user, { password });
    setPasswordResets((current) => ({ ...current, [user.id]: '' }));
  }

  async function handleUpdateRequest(request: AccessRequestRecord, status: AccessRequestStatus) {
    if (!apiBaseUrl || !authToken) return;

    try {
      setIsLoading(true);
      setMessage(undefined);
      const updated = await updateAccessRequestStatus(apiBaseUrl, authToken, request.id, status);
      setAccessRequests((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      if (status === 'approved') {
        setUsers(await listServerUsers(apiBaseUrl, authToken));
      }
      setMessage(status === 'approved' ? '회원가입을 승인하고 사용자 계정을 활성화했습니다.' : '회원가입 신청 상태를 저장했습니다.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '회원가입 신청 상태를 저장하지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }

  if (!apiBaseUrl || !authToken) {
    return null;
  }

  return (
    <section className="admin-panel admin-panel--users" aria-label="사용자 권한 관리">
      <div>
        <h2>사용자 권한</h2>
      </div>

      <div className="admin-users-layout">
        <form className="admin-user-form" onSubmit={handleSubmit}>
          <label>
            <span>아이디</span>
            <input
              autoComplete="off"
              onChange={(event) => setForm((current) => ({ ...current, username: event.target.value.trim() }))}
              required
              type="text"
              value={form.username}
            />
          </label>
          <label>
            <span>표시 이름</span>
            <input
              onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
              required
              type="text"
              value={form.displayName}
            />
          </label>
          <label>
            <span>비밀번호</span>
            <input
              autoComplete="new-password"
              minLength={8}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              required
              type="password"
              value={form.password}
            />
          </label>
          <label>
            <span>권한</span>
            <select
              onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as UserRole }))}
              value={form.role}
            >
              <option value="viewer">조회자</option>
              <option value="editor">편집자</option>
              <option value="admin">관리자</option>
            </select>
          </label>
          <button className="primary-button" disabled={isLoading} type="submit">
            사용자 추가
          </button>
          {message && <p className="admin-user-message">{message}</p>}
        </form>

        <div className="admin-users-table">
          <div className="admin-users-table__head">
            <span>사용자</span>
            <span>권한</span>
            <span>상태</span>
            <span>비밀번호</span>
            <span>저장</span>
          </div>
          {users.map((user) => (
            <div className="admin-users-table__row" key={user.id}>
              <span>
                <strong>{user.displayName}</strong>
                <small>{user.username}</small>
              </span>
              <label className="admin-users-table__field">
                <span>권한</span>
                <select
                  disabled={isLoading}
                  onChange={(event) => void handleUpdateUser(user, { role: event.target.value as UserRole })}
                  value={user.role}
                >
                  <option value="viewer">{ROLE_LABELS.viewer}</option>
                  <option value="editor">{ROLE_LABELS.editor}</option>
                  <option value="admin">{ROLE_LABELS.admin}</option>
                </select>
              </label>
              <label className="admin-users-table__toggle">
                <input
                  checked={user.isActive}
                  disabled={isLoading}
                  onChange={(event) => void handleUpdateUser(user, { isActive: event.target.checked })}
                  type="checkbox"
                />
                <span>{user.isActive ? '활성' : '비활성'}</span>
              </label>
              <label className="admin-users-table__field">
                <span>비밀번호 재설정</span>
                <input
                  disabled={isLoading}
                  minLength={8}
                  onChange={(event) => setPasswordResets((current) => ({ ...current, [user.id]: event.target.value }))}
                  placeholder="8자 이상"
                  type="password"
                  value={passwordResets[user.id] ?? ''}
                />
              </label>
              <button
                className="text-button admin-users-table__save"
                disabled={isLoading || !passwordResets[user.id]}
                type="button"
                onClick={() => void handlePasswordReset(user)}
              >
                재설정
              </button>
            </div>
          ))}
          {users.length === 0 && (
            <div className="admin-users-table__empty">
              {isLoading && !hasLoadedUsers ? '사용자 목록을 불러오는 중입니다.' : '등록된 사용자가 없습니다.'}
            </div>
          )}
        </div>
      </div>

      <section className="admin-access-requests" aria-label="회원가입 신청 목록">
        <div className="admin-access-requests__header">
          <h3>회원가입 신청</h3>
          <span>{accessRequests.filter((request) => request.status === 'pending').length}건 대기</span>
        </div>
        <div className="admin-access-request-list">
          {accessRequests.map((request) => (
            <article className="admin-access-request-row" key={request.id}>
              <div>
                <strong>{request.displayName}</strong>
                <small>{request.email}</small>
              </div>
              <p>{request.reason}</p>
              <a href={`mailto:${request.email}`}>{request.email}</a>
              <div className="admin-access-request-status" role="group" aria-label={`${request.displayName} 신청 상태`}>
                {REQUEST_STATUS_OPTIONS.map((status) => (
                  <button
                    aria-pressed={request.status === status}
                    className={request.status === status ? 'is-active' : ''}
                    disabled={isLoading || request.status === status}
                    key={status}
                    onClick={() => void handleUpdateRequest(request, status)}
                    type="button"
                  >
                    {REQUEST_STATUS_LABELS[status]}
                  </button>
                ))}
              </div>
            </article>
          ))}
          {accessRequests.length === 0 && (
            <p className="admin-users-table__empty">
              {isLoading && !hasLoadedUsers ? '회원가입 신청을 불러오는 중입니다.' : '접수된 회원가입 신청이 없습니다.'}
            </p>
          )}
        </div>
      </section>
    </section>
  );
}
