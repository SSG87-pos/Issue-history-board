import { FormEvent, useEffect, useRef, useState } from 'react';
import type { NewAccessRequest } from '../domain/serverApi';
import PoslabLanyard from './PoslabLanyard.jsx';

type LoginPageProps = {
  isLoading: boolean;
  errorMessage?: string;
  onLogin: (username: string, password: string) => Promise<void>;
  onRequestAccess?: (request: NewAccessRequest) => Promise<void>;
};

const INITIAL_ACCESS_REQUEST: NewAccessRequest = {
  requestedUsername: '',
  displayName: '',
  department: '',
  email: '',
  password: '',
  reason: '',
};

export function LoginPage({ isLoading, errorMessage, onLogin, onRequestAccess }: LoginPageProps) {
  const [mode, setMode] = useState<'signin' | 'request'>('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [accessRequest, setAccessRequest] = useState<NewAccessRequest>(INITIAL_ACCESS_REQUEST);
  const [accessRequestStatus, setAccessRequestStatus] = useState<string | undefined>();
  const [isRequestingAccess, setIsRequestingAccess] = useState(false);
  const usernameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isLoading || mode !== 'signin') return;
    usernameInputRef.current?.focus();
  }, [isLoading, mode]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onLogin(username.trim(), password);
  }

  async function handleAccessRequestSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!onRequestAccess) {
      setAccessRequestStatus('관리자에게 직접 회원가입 정보를 전달해 주세요.');
      return;
    }

    try {
      setIsRequestingAccess(true);
      setAccessRequestStatus(undefined);
      const email = accessRequest.email.trim();
      const displayName = accessRequest.displayName.trim();
      await onRequestAccess({
        ...accessRequest,
        requestedUsername: email,
        displayName,
        department: '미지정',
        email,
        password: accessRequest.password,
        reason: '회원가입',
      });
      setAccessRequest(INITIAL_ACCESS_REQUEST);
      setAccessRequestStatus('회원가입이 접수되었습니다. 관리자가 승인하면 가입한 이메일과 비밀번호로 로그인할 수 있습니다.');
    } catch (error) {
      setAccessRequestStatus(error instanceof Error ? error.message : '회원가입을 접수하지 못했습니다.');
    } finally {
      setIsRequestingAccess(false);
    }
  }

  return (
    <main className="login-screen poslab-entry-screen">
      <div className="poslab-entry-gradient" aria-hidden="true" />
      <section className="poslab-entry-shell" aria-label="PosLAB 이력관리 센터 접속">
        <div className="poslab-entry-visual">
          <PoslabLanyard />
        </div>

        <div className="poslab-entry-panel">
          <div className="poslab-entry-heading">
            <span className="panel-label">POSCO</span>
            <h1>
              <span>PosLAB</span>
              <span className="hub-gradient-text">이력관리 센터</span>
            </h1>
          </div>

          <section className="login-panel poslab-auth-form" aria-label={mode === 'signin' ? '로그인' : '회원가입'}>
            <div className="auth-mode-tabs" role="tablist" aria-label="접속 방식">
              <button
                aria-selected={mode === 'signin'}
                className={mode === 'signin' ? 'active' : ''}
                onClick={() => setMode('signin')}
                role="tab"
                type="button"
              >
                로그인
              </button>
              <button
                aria-selected={mode === 'request'}
                className={mode === 'request' ? 'active' : ''}
                onClick={() => setMode('request')}
                role="tab"
                type="button"
              >
                회원가입
              </button>
            </div>

            {mode === 'request' ? (
              <form className="login-form login-form--request" onSubmit={handleAccessRequestSubmit}>
                <div className="login-form__pair">
                  <label>
                    <span>이름</span>
                    <input
                      autoComplete="name"
                      disabled={isRequestingAccess}
                      maxLength={120}
                      onChange={(event) => setAccessRequest((current) => ({ ...current, displayName: event.target.value }))}
                      required
                      type="text"
                      value={accessRequest.displayName}
                    />
                  </label>
                  <label>
                    <span>이메일</span>
                    <input
                      autoComplete="email"
                      disabled={isRequestingAccess}
                      maxLength={80}
                      onChange={(event) => setAccessRequest((current) => ({ ...current, email: event.target.value }))}
                      required
                      type="email"
                      value={accessRequest.email}
                    />
                  </label>
                </div>
                <label>
                  <span>비밀번호</span>
                  <input
                    autoComplete="new-password"
                    disabled={isRequestingAccess}
                    minLength={8}
                    maxLength={120}
                    onChange={(event) => setAccessRequest((current) => ({ ...current, password: event.target.value }))}
                    required
                    type="password"
                    value={accessRequest.password}
                  />
                </label>
                <button className="primary-button login-request-submit" disabled={isRequestingAccess} type="submit">
                  {isRequestingAccess ? '가입 신청 중' : '회원가입'}
                </button>
                {accessRequestStatus && <p className="login-request-message">{accessRequestStatus}</p>}
              </form>
            ) : (
              <form className="login-form login-form--signin" onSubmit={handleSubmit}>
                <label>
                  <span>이메일</span>
                  <input
                    autoComplete="username"
                    autoFocus
                    disabled={isLoading}
                    name="username"
                    onChange={(event) => setUsername(event.target.value)}
                    ref={usernameInputRef}
                    required
                    type="text"
                    value={username}
                  />
                </label>
                <label>
                  <span>비밀번호</span>
                  <input
                    autoComplete="current-password"
                    disabled={isLoading}
                    name="password"
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    type="password"
                    value={password}
                  />
                </label>
                {errorMessage && <p className="login-error">{errorMessage}</p>}
                <button className="primary-button login-submit" disabled={isLoading} type="submit">
                  {isLoading ? '확인 중' : '로그인'}
                </button>
              </form>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
