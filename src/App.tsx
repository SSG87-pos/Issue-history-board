import {
  Bell,
  ChevronDown,
  CirclePlus,
  Clock3,
  FileText,
  Home,
  LockKeyhole,
  LogOut,
  PencilLine,
  Search,
  Settings,
  UserRound,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AddHistoryPanel } from './components/AddHistoryPanel';
import { AdminPage } from './components/AdminPage';
import { HomeDashboard } from './components/HomeDashboard';
import { SubtopicDetailPage } from './components/SubtopicDetailPage';
import { LoginPage } from './components/LoginPage';
import { ReportPage } from './components/ReportPage';
import type { ReportFilterPreset } from './components/ReportPage';
import { deserializeBoardData, loadBoardData, resetBoardData, saveBoardData } from './domain/persistence';
import { deleteHistoryEntry } from './domain/mutations';
import { seedData } from './domain/seedData';
import {
  fetchBoardData,
  fetchCurrentUser,
  getServerApiBaseUrl,
  loginToServer,
  saveBoardDataToServer,
  submitAccessRequest,
  type CurrentUser,
  type NewAccessRequest,
} from './domain/serverApi';
import { importBoardDataFromXlsx } from './domain/xlsxExchange';
import {
  getHistoryRowsForSubtopic,
  getLongRunningUnresolvedIssues,
  getSubtopicSummaries,
} from './domain/selectors';
import type { Category, DetailIssue, HistoryEntry, IssueBoardData, IssueGroup, Subtopic } from './domain/types';

const SERVER_API_BASE_URL = getServerApiBaseUrl();
const SESSION_TOKEN_KEY = 'research-issue-board-auth-token';
const GLOBAL_SEARCH_LIMIT = 8;

type GlobalSearchResult =
  | { kind: 'subtopic'; id: string; title: string; meta: string }
  | { kind: 'issue'; id: string; title: string; meta: string }
  | { kind: 'entry'; id: string; title: string; meta: string };

function getFirstEntryForSubtopic(data: IssueBoardData, subtopicId: string): HistoryEntry | undefined {
  return getHistoryRowsForSubtopic(data, subtopicId)[0]?.entry;
}

function getFirstEntryForIssue(data: IssueBoardData, issueGroupId: string): HistoryEntry | undefined {
  return data.historyEntries
    .filter((entry) => entry.issueGroupId === issueGroupId)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
}

function hasBoardContent(data: IssueBoardData): boolean {
  return data.categories.length > 0 && data.subtopics.length > 0;
}

function canEdit(user: CurrentUser | undefined): boolean {
  return user?.role === 'admin' || user?.role === 'editor';
}

function canAdmin(user: CurrentUser | undefined): boolean {
  return user?.role === 'admin';
}

function normalizeSearchText(value: string): string {
  return value.replace(/\s+/g, '').toLowerCase();
}

export function App() {
  const [data, setData] = useState(() => (SERVER_API_BASE_URL ? seedData : loadBoardData()));
  const [selectedSubtopicId, setSelectedSubtopicId] = useState('sts');
  const [selectedEntryId, setSelectedEntryId] = useState<string | undefined>(() =>
    getFirstEntryForSubtopic(SERVER_API_BASE_URL ? seedData : loadBoardData(), 'sts')?.id,
  );
  const [page, setPage] = useState<'home' | 'subtopic' | 'report' | 'admin'>('home');
  const [subtopicDashboardFilter, setSubtopicDashboardFilter] = useState<'all' | 'delayed'>('all');
  const [reportFilterPreset, setReportFilterPreset] = useState<ReportFilterPreset | undefined>();
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [historyPanelMode, setHistoryPanelMode] = useState<'add' | 'edit' | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | undefined>();
  const [authToken, setAuthToken] = useState<string | undefined>(() =>
    SERVER_API_BASE_URL ? window.sessionStorage.getItem(SESSION_TOKEN_KEY) ?? undefined : undefined,
  );
  const [currentUser, setCurrentUser] = useState<CurrentUser | undefined>();
  const [authStatus, setAuthStatus] = useState<'checking' | 'login' | 'ready' | 'saving'>(
    SERVER_API_BASE_URL ? 'checking' : 'ready',
  );
  const [authError, setAuthError] = useState<string | undefined>();
  const lastSavedServerPayloadRef = useRef<string | undefined>(undefined);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!SERVER_API_BASE_URL) {
      saveBoardData(data);
    }
  }, [data]);

  useEffect(() => {
    if (!SERVER_API_BASE_URL) return;
    if (!authToken) {
      setAuthStatus('login');
      return;
    }

    let cancelled = false;

    async function hydrateServerSession() {
      try {
        setAuthStatus('checking');
        const [user, boardData] = await Promise.all([
          fetchCurrentUser(SERVER_API_BASE_URL!, authToken!),
          fetchBoardData(SERVER_API_BASE_URL!, authToken!),
        ]);
        if (cancelled) return;
        const serverHasContent = hasBoardContent(boardData);
        const hydratedData = serverHasContent ? boardData : seedData;
        lastSavedServerPayloadRef.current = serverHasContent ? JSON.stringify(hydratedData) : undefined;
        setCurrentUser(user);
        setData(hydratedData);
        setSelectedEntryId(getFirstEntryForSubtopic(hydratedData, selectedSubtopicId)?.id);
        setAuthError(undefined);
        setAuthStatus('ready');
      } catch {
        if (cancelled) return;
        window.sessionStorage.removeItem(SESSION_TOKEN_KEY);
        setAuthToken(undefined);
        setCurrentUser(undefined);
        setAuthError('세션을 확인할 수 없습니다. 다시 로그인해 주세요.');
        setAuthStatus('login');
      }
    }

    void hydrateServerSession();

    return () => {
      cancelled = true;
    };
  }, [authToken]);

  useEffect(() => {
    if (!SERVER_API_BASE_URL || !authToken || authStatus !== 'ready' || !canEdit(currentUser)) return;
    const payload = JSON.stringify(data);
    if (lastSavedServerPayloadRef.current === payload) return;

    const timeoutId = window.setTimeout(() => {
      setAuthStatus('saving');
      saveBoardDataToServer(SERVER_API_BASE_URL, authToken, data)
        .then(() => {
          lastSavedServerPayloadRef.current = payload;
          setAuthStatus('ready');
        })
        .catch(() => {
          setAuthError('변경 내용을 서버에 저장하지 못했습니다.');
          setAuthStatus('ready');
        });
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [authStatus, authToken, currentUser, data]);

  useEffect(() => {
    if (page === 'admin' && !canAdmin(currentUser) && SERVER_API_BASE_URL) {
      setPage('home');
    }
  }, [currentUser, page]);

  useEffect(() => {
    function handleKeyboardShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsSearchOpen(true);
        searchInputRef.current?.focus();
      }
      if (event.key === 'Escape') {
        setIsSearchOpen(false);
        setIsNotificationsOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyboardShortcut);
    return () => window.removeEventListener('keydown', handleKeyboardShortcut);
  }, []);

  const summaries = useMemo(() => getSubtopicSummaries(data), [data]);
  const longRunningIssues = useMemo(() => getLongRunningUnresolvedIssues(data), [data]);
  const categoryById = useMemo(() => new Map(data.categories.map((category) => [category.id, category])), [data.categories]);
  const subtopicById = useMemo(() => new Map(data.subtopics.map((subtopic) => [subtopic.id, subtopic])), [data.subtopics]);
  const issueById = useMemo(() => new Map(data.issueGroups.map((issue) => [issue.id, issue])), [data.issueGroups]);
  const globalSearchResults = useMemo(() => {
    const query = normalizeSearchText(globalSearchQuery);
    if (!query) return [];

    const results: GlobalSearchResult[] = [];

    for (const subtopic of data.subtopics.filter((item) => !item.hidden)) {
      const category = categoryById.get(subtopic.categoryId);
      const haystack = normalizeSearchText([category?.label, subtopic.label, subtopic.id].join(' '));
      if (haystack.includes(query)) {
        results.push({
          kind: 'subtopic',
          id: subtopic.id,
          title: subtopic.label,
          meta: `${category?.label ?? '대분류'} / 하위 주제`,
        });
      }
    }

    for (const issue of data.issueGroups.filter((item) => !item.archived)) {
      const category = categoryById.get(issue.categoryId);
      const subtopic = subtopicById.get(issue.subtopicId);
      const haystack = normalizeSearchText([
        category?.label,
        subtopic?.label,
        issue.title,
        issue.currentSummary,
        issue.groupLabel,
        issue.ownerName,
        issue.ownerResearchGroup,
        issue.relatedDepartment,
        ...issue.tags,
      ].join(' '));
      if (haystack.includes(query)) {
        results.push({
          kind: 'issue',
          id: issue.id,
          title: issue.title,
          meta: `${category?.label ?? '대분류'} / ${subtopic?.label ?? issue.subtopicId}`,
        });
      }
    }

    for (const entry of data.historyEntries) {
      const issue = issueById.get(entry.issueGroupId);
      if (!issue || issue.archived) continue;
      const subtopic = subtopicById.get(issue.subtopicId);
      const haystack = normalizeSearchText([
        entry.date,
        entry.summary,
        entry.details,
        entry.remainingRisk,
        entry.blockName,
        entry.authorName,
        issue.title,
        issue.groupLabel,
      ].join(' '));
      if (haystack.includes(query)) {
        results.push({
          kind: 'entry',
          id: entry.id,
          title: entry.summary,
          meta: `${entry.date} / ${subtopic?.label ?? issue.subtopicId}`,
        });
      }
    }

    return results.slice(0, GLOBAL_SEARCH_LIMIT);
  }, [categoryById, data.historyEntries, data.issueGroups, data.subtopics, globalSearchQuery, issueById, subtopicById]);
  const recentEntries = useMemo(
    () => data.historyEntries.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4),
    [data.historyEntries],
  );
  const notificationCount = longRunningIssues.length + recentEntries.length;
  const historyRows = useMemo(() => getHistoryRowsForSubtopic(data, selectedSubtopicId), [data, selectedSubtopicId]);
  const entries = useMemo(() => historyRows.map((row) => row.entry), [historyRows]);
  const issues = useMemo(() => {
    const issueIds = new Set(historyRows.map((row) => row.issue.id));
    return data.issueGroups.filter((issue) => issue.subtopicId === selectedSubtopicId && issueIds.has(issue.id));
  }, [data.issueGroups, historyRows, selectedSubtopicId]);
  const selectedEntry = entries.find((entry) => entry.id === selectedEntryId) ?? entries[0];
  const selectedIssue = selectedEntry ? data.issueGroups.find((issue) => issue.id === selectedEntry.issueGroupId) : undefined;
  const selectedSubtopic = data.subtopics.find((subtopic) => subtopic.id === selectedSubtopicId);
  const selectedCategory = data.categories.find((category) => category.id === selectedSubtopic?.categoryId);

  function openSubtopic(subtopicId: string) {
    setSelectedSubtopicId(subtopicId);
    setSelectedEntryId(getFirstEntryForSubtopic(data, subtopicId)?.id);
    setSubtopicDashboardFilter('all');
    setPage('subtopic');
  }

  function openLongRunningIssue(issue: IssueGroup) {
    setSelectedSubtopicId(issue.subtopicId);
    setSelectedEntryId(getFirstEntryForIssue(data, issue.id)?.id ?? getFirstEntryForSubtopic(data, issue.subtopicId)?.id);
    setSubtopicDashboardFilter('delayed');
    setIsNotificationsOpen(false);
    setPage('subtopic');
  }

  function openLongRunningIssues() {
    const firstIssue = longRunningIssues[0];
    if (firstIssue) {
      openLongRunningIssue(firstIssue);
      return;
    }
    setSubtopicDashboardFilter('delayed');
    setPage('subtopic');
  }

  function openReport(filters: Omit<ReportFilterPreset, 'nonce'> = {}) {
    setReportFilterPreset({ ...filters, nonce: Date.now() });
    setPage('report');
  }

  function closeGlobalSearch() {
    setIsSearchOpen(false);
    setGlobalSearchQuery('');
  }

  function openSearchResult(result: GlobalSearchResult) {
    if (result.kind === 'subtopic') {
      openSubtopic(result.id);
    } else if (result.kind === 'issue') {
      const issue = data.issueGroups.find((item) => item.id === result.id);
      if (issue) {
        setSelectedSubtopicId(issue.subtopicId);
        setSelectedEntryId(getFirstEntryForIssue(data, issue.id)?.id ?? getFirstEntryForSubtopic(data, issue.subtopicId)?.id);
        setSubtopicDashboardFilter('all');
        setPage('subtopic');
      }
    } else {
      openEntry(result.id);
    }
    closeGlobalSearch();
  }

  function openEntry(entryId: string) {
    const entry = data.historyEntries.find((item) => item.id === entryId);
    const issue = entry ? data.issueGroups.find((item) => item.id === entry.issueGroupId) : undefined;
    if (issue) setSelectedSubtopicId(issue.subtopicId);
    setSelectedEntryId(entryId);
    setSubtopicDashboardFilter('all');
    setPage('subtopic');
  }

  function openAddPanel() {
    if (SERVER_API_BASE_URL && !canEdit(currentUser)) return;
    setEditingEntryId(undefined);
    setHistoryPanelMode('add');
  }

  function openEditPanel(entry: HistoryEntry) {
    if (SERVER_API_BASE_URL && !canEdit(currentUser)) return;
    setEditingEntryId(entry.id);
    setHistoryPanelMode('edit');
  }

  function handleDeleteEntry(entry: HistoryEntry) {
    if (SERVER_API_BASE_URL && !canEdit(currentUser)) return;
    const confirmed = window.confirm('선택한 이력을 삭제할까요? 삭제 후 남은 이력을 기준으로 이슈 상태가 다시 계산됩니다.');
    if (!confirmed) return;

    const nextData = deleteHistoryEntry(data, entry.id);
    setData(nextData);
    const nextSubtopicId =
      nextData.issueGroups.find((issue) => issue.id === entry.issueGroupId)?.subtopicId ?? selectedSubtopicId;
    setSelectedSubtopicId(nextSubtopicId);
    setSelectedEntryId(getFirstEntryForSubtopic(nextData, nextSubtopicId)?.id);
  }

  function handleToggleReview(detailIssueId: string) {
    if (SERVER_API_BASE_URL && !canEdit(currentUser)) return;
    setData((current) => ({
      ...current,
      detailIssues: current.detailIssues.map((detailIssue) =>
        detailIssue.id === detailIssueId ? { ...detailIssue, needsReview: !detailIssue.needsReview } : detailIssue,
      ),
    }));
  }

  function handleAddEntry(
    issueGroup: IssueGroup,
    detailIssue: DetailIssue,
    entry: HistoryEntry,
    options: {
      isNewIssueGroup: boolean;
      isNewDetailIssue: boolean;
      category?: Category;
      subtopic?: Subtopic;
    },
  ) {
    setData((current) => ({
      ...current,
      categories: options.category && !current.categories.some((item) => item.id === options.category?.id)
        ? [...current.categories, options.category]
        : current.categories,
      subtopics: options.subtopic && !current.subtopics.some((item) => item.id === options.subtopic?.id)
        ? [...current.subtopics, options.subtopic]
        : current.subtopics,
      detailIssues: options.isNewDetailIssue
        ? [...current.detailIssues, detailIssue]
        : current.detailIssues.map((item) =>
            item.id === detailIssue.id
              ? {
                  ...item,
                  ownerName: detailIssue.ownerName,
                  ownerResearchGroup: detailIssue.ownerResearchGroup,
                  relatedDepartment: detailIssue.relatedDepartment,
                  status: entry.changesDetailIssueStatus ? entry.status : item.status,
                  latestUpdatedAt: entry.date,
                  currentSummary: entry.summary,
                  completedAt: entry.status === 'resolved' ? entry.date : item.completedAt,
                }
              : item,
          ),
      issueGroups: options.isNewIssueGroup
        ? [...current.issueGroups, issueGroup]
        : current.issueGroups.map((item) =>
            item.id === issueGroup.id
              ? {
                  ...item,
                  latestUpdatedAt: entry.date,
                  currentSummary: entry.summary,
                  status: entry.changesDetailIssueStatus ? entry.status : item.status,
                  statusSource: 'auto',
                  ownerName: detailIssue.ownerName,
                  ownerResearchGroup: detailIssue.ownerResearchGroup,
                  relatedDepartment: detailIssue.relatedDepartment,
                }
              : item,
          ),
      historyEntries: [...current.historyEntries, entry],
    }));
    setSelectedSubtopicId(issueGroup.subtopicId);
    setSelectedEntryId(entry.id);
    setPage('subtopic');
    setHistoryPanelMode(null);
  }

  function handleUpdateEntry(entry: HistoryEntry, detailIssue?: DetailIssue) {
    setData((current) => {
      const nextHistoryEntries = current.historyEntries.map((item) => (item.id === entry.id ? entry : item));
      const latestForIssue = nextHistoryEntries
        .filter((item) => item.issueGroupId === entry.issueGroupId)
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      const latestForDetail = nextHistoryEntries
        .filter((item) => item.detailIssueId === entry.detailIssueId)
        .sort((a, b) => b.date.localeCompare(a.date))[0];

      return {
        ...current,
        historyEntries: nextHistoryEntries,
        detailIssues: current.detailIssues.map((item) =>
          item.id === entry.detailIssueId && latestForDetail
            ? {
                ...item,
                ...(detailIssue && item.id === detailIssue.id
                  ? {
                      ownerName: detailIssue.ownerName,
                      ownerResearchGroup: detailIssue.ownerResearchGroup,
                      relatedDepartment: detailIssue.relatedDepartment,
                    }
                  : {}),
                status: latestForDetail.changesDetailIssueStatus ? latestForDetail.status : item.status,
                latestUpdatedAt: latestForDetail.date,
                currentSummary: latestForDetail.summary,
                completedAt: latestForDetail.status === 'resolved' ? latestForDetail.date : item.completedAt,
              }
            : item,
        ),
        issueGroups: current.issueGroups.map((item) =>
          item.id === entry.issueGroupId && latestForIssue
            ? {
                ...item,
                latestUpdatedAt: latestForIssue.date,
                currentSummary: latestForIssue.summary,
                status: latestForIssue.changesDetailIssueStatus ? latestForIssue.status : item.status,
                statusSource: 'auto',
                ...(detailIssue
                  ? {
                      ownerName: detailIssue.ownerName,
                      ownerResearchGroup: detailIssue.ownerResearchGroup,
                      relatedDepartment: detailIssue.relatedDepartment,
                    }
                  : {}),
              }
            : item,
        ),
      };
    });
    setSelectedEntryId(entry.id);
    setHistoryPanelMode(null);
    setEditingEntryId(undefined);
  }

  function handleImportJson(json: string) {
    if (SERVER_API_BASE_URL && !canEdit(currentUser)) return;
    const imported = deserializeBoardData(json);
    const firstSubtopic = imported.subtopics.find((subtopic) => !subtopic.hidden);
    const nextSubtopicId = firstSubtopic?.id ?? 'sts';
    setData(imported);
    setSelectedSubtopicId(nextSubtopicId);
    setSelectedEntryId(getFirstEntryForSubtopic(imported, nextSubtopicId)?.id);
    setPage('home');
  }

  function handleImportXlsx(file: ArrayBuffer) {
    if (SERVER_API_BASE_URL && !canEdit(currentUser)) return;
    const imported = importBoardDataFromXlsx(data, file);
    const firstSubtopic = imported.subtopics.find((subtopic) => !subtopic.hidden);
    const nextSubtopicId = firstSubtopic?.id ?? 'sts';
    setData(imported);
    setSelectedSubtopicId(nextSubtopicId);
    setSelectedEntryId(getFirstEntryForSubtopic(imported, nextSubtopicId)?.id);
    setPage('home');
  }

  function handleReset() {
    if (SERVER_API_BASE_URL && !canEdit(currentUser)) return;
    const reset = resetBoardData();
    setData(reset);
    setSelectedSubtopicId('sts');
    setSelectedEntryId(getFirstEntryForSubtopic(reset, 'sts')?.id);
    setPage('home');
  }

  async function handleLogin(username: string, password: string) {
    if (!SERVER_API_BASE_URL) return;
    try {
      setAuthError(undefined);
      setAuthStatus('checking');
      const session = await loginToServer(SERVER_API_BASE_URL, username, password);
      const boardData = await fetchBoardData(SERVER_API_BASE_URL, session.accessToken);
      const serverHasContent = hasBoardContent(boardData);
      const hydratedData = serverHasContent ? boardData : seedData;
      lastSavedServerPayloadRef.current = serverHasContent ? JSON.stringify(hydratedData) : undefined;
      window.sessionStorage.setItem(SESSION_TOKEN_KEY, session.accessToken);
      setAuthToken(session.accessToken);
      setCurrentUser(session.user);
      setData(hydratedData);
      setSelectedEntryId(getFirstEntryForSubtopic(hydratedData, selectedSubtopicId)?.id);
      setAuthStatus('ready');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : '로그인에 실패했습니다.');
      setAuthStatus('login');
    }
  }

  async function handleAccessRequest(request: NewAccessRequest) {
    if (!SERVER_API_BASE_URL) return;
    await submitAccessRequest(SERVER_API_BASE_URL, request);
  }

  function handleLogout() {
    window.sessionStorage.removeItem(SESSION_TOKEN_KEY);
    setAuthToken(undefined);
    setCurrentUser(undefined);
    setAuthStatus('login');
    setPage('home');
  }

  if (SERVER_API_BASE_URL && authStatus !== 'ready' && authStatus !== 'saving') {
    return (
      <LoginPage
        errorMessage={authError}
        isLoading={authStatus === 'checking'}
        onRequestAccess={handleAccessRequest}
        onLogin={handleLogin}
      />
    );
  }

  return (
    <main className="app-shell">
      <aside className="app-sidebar" aria-label="앱 메뉴">
        <nav className="sidebar-nav" aria-label="주요 메뉴">
          <button className={page === 'home' ? 'is-active' : ''} type="button" onClick={() => setPage('home')}>
            <span className="menu-icon" aria-hidden="true"><Home size={16} strokeWidth={2.2} /></span>
            <span className="menu-label">홈</span>
          </button>
          <button
            className={page === 'subtopic' ? 'is-active' : ''}
            type="button"
            onClick={() => {
              setSubtopicDashboardFilter('all');
              setPage('subtopic');
            }}
          >
            <span className="menu-icon" aria-hidden="true"><Clock3 size={16} strokeWidth={2.2} /></span>
            <span className="menu-label">이슈 이력</span>
          </button>
          {(!SERVER_API_BASE_URL || canEdit(currentUser)) && (
            <button type="button" onClick={openAddPanel}>
              <span className="menu-icon" aria-hidden="true"><PencilLine size={16} strokeWidth={2.2} /></span>
              <span className="menu-label">이력 추가</span>
            </button>
          )}
          <button className={page === 'report' ? 'is-active' : ''} type="button" onClick={() => openReport()}>
            <span className="menu-icon" aria-hidden="true"><FileText size={16} strokeWidth={2.2} /></span>
            <span className="menu-label">보고서</span>
          </button>
          {(!SERVER_API_BASE_URL || canAdmin(currentUser)) && (
            <button className={page === 'admin' ? 'is-active' : ''} type="button" onClick={() => setPage('admin')}>
              <span className="menu-icon" aria-hidden="true"><Settings size={16} strokeWidth={2.2} /></span>
              <span className="menu-label">관리자</span>
            </button>
          )}
        </nav>
        <div className="sidebar-user">
          <div className="sidebar-user__identity">
            <span className="sidebar-user-icon" aria-hidden="true"><UserRound size={15} strokeWidth={2.2} /></span>
            <div>
              <strong>{currentUser?.displayName ?? '관리자'}</strong>
              <span>{currentUser ? currentUser.role : '연구기획팀'}</span>
            </div>
          </div>
          <button className="sidebar-logout" type="button" onClick={handleLogout}>
            <LogOut size={14} strokeWidth={2.2} />
            <span>로그아웃</span>
          </button>
        </div>
      </aside>

      <section className="app-main" aria-label="PosLAB 이력관리 센터">
        <header className="app-topbar">
          <div className="topbar-title">
            <h1>PosLAB 이력관리 센터</h1>
            <span>
              <LockKeyhole size={13} />
              내부 전용
            </span>
          </div>
          <div className={`global-search ${isSearchOpen ? 'is-open' : ''}`}>
            <Search size={17} />
            <input
              aria-controls="global-search-results"
              aria-expanded={isSearchOpen && globalSearchQuery.trim().length > 0}
              aria-label="전체 검색"
              onChange={(event) => {
                setGlobalSearchQuery(event.target.value);
                setIsSearchOpen(true);
                setIsNotificationsOpen(false);
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="검색"
              ref={searchInputRef}
              role="combobox"
              type="search"
              value={globalSearchQuery}
            />
            <kbd>⌘ K</kbd>
            {isSearchOpen && globalSearchQuery.trim() && (
              <div className="global-search-results" id="global-search-results" role="region" aria-label="검색 결과">
                {globalSearchResults.length > 0 ? (
                  globalSearchResults.map((result) => (
                    <button key={`${result.kind}-${result.id}`} type="button" onClick={() => openSearchResult(result)}>
                      <span>{result.kind === 'subtopic' ? '주제' : result.kind === 'issue' ? '이슈' : '이력'}</span>
                      <strong>{result.title}</strong>
                      <small>{result.meta}</small>
                    </button>
                  ))
                ) : (
                  <p>검색 결과가 없습니다.</p>
                )}
              </div>
            )}
          </div>
          <div className="topbar-notification">
            <button
              aria-expanded={isNotificationsOpen}
              className="icon-button topbar-icon"
              type="button"
              aria-label={`알림 ${notificationCount}건`}
              onClick={() => {
                setIsNotificationsOpen((value) => !value);
                setIsSearchOpen(false);
              }}
            >
              <Bell size={17} />
              {notificationCount > 0 && <span className="notification-badge">{Math.min(notificationCount, 99)}</span>}
            </button>
            {isNotificationsOpen && (
              <div className="notification-panel" role="region" aria-label="알림 목록">
                <div className="notification-panel__header">
                  <strong>알림</strong>
                  <span>{notificationCount}건</span>
                </div>
                {longRunningIssues.length > 0 && (
                  <div className="notification-group">
                    <h2>처리 지연</h2>
                    {longRunningIssues.slice(0, 4).map((issue) => (
                      <button key={issue.id} type="button" onClick={() => openLongRunningIssue(issue)}>
                        <span>30일 이상</span>
                        <strong>{issue.title}</strong>
                        <small>{categoryById.get(issue.categoryId)?.label ?? '대분류'} / {subtopicById.get(issue.subtopicId)?.label ?? issue.subtopicId}</small>
                      </button>
                    ))}
                  </div>
                )}
                <div className="notification-group">
                  <h2>최근 업데이트</h2>
                  {recentEntries.map((entry) => {
                    const issue = issueById.get(entry.issueGroupId);
                    return (
                      <button key={entry.id} type="button" onClick={() => {
                        openEntry(entry.id);
                        setIsNotificationsOpen(false);
                      }}>
                        <span>{entry.date}</span>
                        <strong>{entry.summary}</strong>
                        <small>{issue?.title ?? '이슈 없음'}</small>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          {page === 'home' && (!SERVER_API_BASE_URL || canEdit(currentUser)) && (
            <button className="primary-button" type="button" onClick={openAddPanel}>
              <CirclePlus size={16} />
              이력 추가
              <ChevronDown size={15} />
            </button>
          )}
        </header>

        <div className="main-content">
          {page === 'home' ? (
            <HomeDashboard
              categories={data.categories}
              subtopics={data.subtopics}
              summaries={summaries}
              longRunningIssues={longRunningIssues}
              selectedSubtopicId={selectedSubtopicId}
              onSelectSubtopic={openSubtopic}
              onSelectLongRunningIssue={openLongRunningIssue}
              onViewLongRunningIssues={openLongRunningIssues}
            />
          ) : page === 'subtopic' ? (
            <SubtopicDetailPage
              data={data}
              category={selectedCategory}
              subtopic={selectedSubtopic}
              issues={issues}
              entries={entries}
              selectedEntryId={selectedEntry?.id}
              onSelectEntry={openEntry}
              onBackHome={() => setPage('home')}
              onOpenAdd={openAddPanel}
              onOpenEdit={openEditPanel}
              onDeleteEntry={handleDeleteEntry}
              onToggleReview={handleToggleReview}
              canEditEntries={!SERVER_API_BASE_URL || canEdit(currentUser)}
              initialDashboardFilter={subtopicDashboardFilter}
            />
          ) : page === 'report' ? (
            <ReportPage
              data={data}
              onImportJson={handleImportJson}
              onImportXlsx={handleImportXlsx}
              onReset={handleReset}
              canManageData={!SERVER_API_BASE_URL || canAdmin(currentUser)}
              filterPreset={reportFilterPreset}
            />
          ) : (
            <AdminPage
              data={data}
              onImportJson={handleImportJson}
              onImportXlsx={handleImportXlsx}
              onReset={handleReset}
              onChangeData={setData}
              onOpenReport={openReport}
              apiBaseUrl={SERVER_API_BASE_URL}
              authToken={authToken}
            />
          )}
        </div>
      </section>

      {historyPanelMode && (
        <AddHistoryPanel
          data={data}
          categoryId={selectedIssue?.categoryId ?? selectedCategory?.id ?? 'grade-product'}
          subtopicId={selectedSubtopicId}
          initialIssueGroupId={selectedIssue?.id}
          initialDetailIssueId={selectedEntry?.detailIssueId}
          editingEntry={historyPanelMode === 'edit' ? data.historyEntries.find((entry) => entry.id === editingEntryId) : undefined}
          onAddEntry={handleAddEntry}
          onUpdateEntry={handleUpdateEntry}
          onClose={() => {
            setHistoryPanelMode(null);
            setEditingEntryId(undefined);
          }}
        />
      )}
    </main>
  );
}
