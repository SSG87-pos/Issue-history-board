import { PlusCircle } from 'lucide-react';
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
  const [isAdding, setIsAdding] = useState(false);

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
    setIsAdding(false);
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
      <header className="app-header">
        <div>
          <p className="eyebrow">Research Issue Board</p>
          <h1>연구원 이력 관리</h1>
        </div>
        {page === 'home' && (
          <button className="primary-button" type="button" onClick={() => setIsAdding(true)}>
            <PlusCircle size={17} />
            이력 추가
          </button>
        )}
      </header>

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
          onSelectEntry={setSelectedEntryId}
          onBackHome={() => setPage('home')}
          onOpenAdd={() => setIsAdding(true)}
        />
      )}

      <AdminDataPanel data={data} onImportJson={handleImportJson} onReset={handleReset} />

      {isAdding && (
        <AddHistoryPanel
          data={data}
          categoryId={selectedIssue?.categoryId ?? selectedCategory?.id ?? 'grade-product'}
          subtopicId={selectedSubtopicId}
          initialIssueGroupId={selectedIssue?.id}
          initialDetailIssueId={selectedEntry?.detailIssueId}
          onAddEntry={handleAddEntry}
          onClose={() => setIsAdding(false)}
        />
      )}
    </main>
  );
}
