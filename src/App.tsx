import {
  Bell,
  ChevronDown,
  CirclePlus,
  Clock3,
  FileText,
  Home,
  LockKeyhole,
  PencilLine,
  Search,
  Settings,
  UserRound,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AddHistoryPanel } from './components/AddHistoryPanel';
import { AdminDataPanel } from './components/AdminDataPanel';
import { HomeDashboard } from './components/HomeDashboard';
import { SubtopicDetailPage } from './components/SubtopicDetailPage';
import { deserializeBoardData, loadBoardData, resetBoardData, saveBoardData } from './domain/persistence';
import {
  getHistoryRowsForSubtopic,
  getLongRunningUnresolvedIssues,
  getSubtopicSummaries,
} from './domain/selectors';
import type { DetailIssue, HistoryEntry, IssueBoardData, IssueGroup } from './domain/types';

function getFirstEntryForSubtopic(data: IssueBoardData, subtopicId: string): HistoryEntry | undefined {
  return getHistoryRowsForSubtopic(data, subtopicId)[0]?.entry;
}

export function App() {
  const [data, setData] = useState(() => loadBoardData());
  const [selectedSubtopicId, setSelectedSubtopicId] = useState('sts');
  const [selectedEntryId, setSelectedEntryId] = useState<string | undefined>(() =>
    getFirstEntryForSubtopic(loadBoardData(), 'sts')?.id,
  );
  const [page, setPage] = useState<'home' | 'subtopic'>('home');
  const [historyPanelMode, setHistoryPanelMode] = useState<'add' | 'edit' | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | undefined>();

  useEffect(() => {
    saveBoardData(data);
  }, [data]);

  const summaries = useMemo(() => getSubtopicSummaries(data), [data]);
  const longRunningIssues = useMemo(() => getLongRunningUnresolvedIssues(data), [data]);
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
    setPage('subtopic');
  }

  function openEntry(entryId: string) {
    const entry = data.historyEntries.find((item) => item.id === entryId);
    const issue = entry ? data.issueGroups.find((item) => item.id === entry.issueGroupId) : undefined;
    if (issue) setSelectedSubtopicId(issue.subtopicId);
    setSelectedEntryId(entryId);
    setPage('subtopic');
  }

  function openAddPanel() {
    setEditingEntryId(undefined);
    setHistoryPanelMode('add');
  }

  function openEditPanel(entry: HistoryEntry) {
    setEditingEntryId(entry.id);
    setHistoryPanelMode('edit');
  }

  function handleAddEntry(
    issueGroup: IssueGroup,
    detailIssue: DetailIssue,
    entry: HistoryEntry,
    isNewDetailIssue: boolean,
  ) {
    setData((current) => ({
      ...current,
      detailIssues: isNewDetailIssue
        ? [...current.detailIssues, detailIssue]
        : current.detailIssues.map((item) =>
            item.id === detailIssue.id
              ? {
                  ...item,
                  status: entry.changesDetailIssueStatus ? entry.status : item.status,
                  latestUpdatedAt: entry.date,
                  currentSummary: entry.summary,
                  completedAt: entry.status === 'resolved' ? entry.date : item.completedAt,
                }
              : item,
          ),
      issueGroups: current.issueGroups.map((item) =>
        item.id === issueGroup.id
          ? {
              ...item,
              latestUpdatedAt: entry.date,
              currentSummary: entry.summary,
              status: entry.changesDetailIssueStatus ? entry.status : item.status,
              statusSource: 'auto',
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

  function handleUpdateEntry(entry: HistoryEntry) {
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
    const imported = deserializeBoardData(json);
    const firstSubtopic = imported.subtopics.find((subtopic) => !subtopic.hidden);
    const nextSubtopicId = firstSubtopic?.id ?? 'sts';
    setData(imported);
    setSelectedSubtopicId(nextSubtopicId);
    setSelectedEntryId(getFirstEntryForSubtopic(imported, nextSubtopicId)?.id);
    setPage('home');
  }

  function handleReset() {
    const reset = resetBoardData();
    setData(reset);
    setSelectedSubtopicId('sts');
    setSelectedEntryId(getFirstEntryForSubtopic(reset, 'sts')?.id);
    setPage('home');
  }

  return (
    <main className="app-shell">
      <aside className="app-sidebar" aria-label="앱 메뉴">
        <nav className="sidebar-nav" aria-label="주요 메뉴">
          <button className={page === 'home' ? 'is-active' : ''} type="button" onClick={() => setPage('home')}>
            <span className="menu-icon" aria-hidden="true"><Home size={16} strokeWidth={2.2} /></span>
            <span className="menu-label">홈</span>
          </button>
          <button className={page === 'subtopic' ? 'is-active' : ''} type="button" onClick={() => setPage('subtopic')}>
            <span className="menu-icon" aria-hidden="true"><Clock3 size={16} strokeWidth={2.2} /></span>
            <span className="menu-label">이슈 이력</span>
          </button>
          <button type="button" onClick={openAddPanel}>
            <span className="menu-icon" aria-hidden="true"><PencilLine size={16} strokeWidth={2.2} /></span>
            <span className="menu-label">이력 추가</span>
          </button>
          <button type="button">
            <span className="menu-icon" aria-hidden="true"><FileText size={16} strokeWidth={2.2} /></span>
            <span className="menu-label">보고서</span>
          </button>
          <button type="button">
            <span className="menu-icon" aria-hidden="true"><Settings size={16} strokeWidth={2.2} /></span>
            <span className="menu-label">설정</span>
          </button>
        </nav>
        <div className="sidebar-user">
          <span className="sidebar-user-icon" aria-hidden="true"><UserRound size={15} strokeWidth={2.2} /></span>
          <div>
            <strong>관리자</strong>
            <span>연구기획팀</span>
          </div>
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
          <label className="global-search">
            <Search size={17} />
            <input type="search" placeholder="검색" />
            <kbd>⌘ K</kbd>
          </label>
          <button className="icon-button topbar-icon" type="button" aria-label="알림">
            <Bell size={17} />
          </button>
          {page === 'home' && (
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
            />
          ) : (
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
            />
          )}

          <AdminDataPanel data={data} onImportJson={handleImportJson} onReset={handleReset} />
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
