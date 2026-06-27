import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { seedData } from '../domain/seedData';
import { HistoryList } from './HistoryList';

describe('HistoryList', () => {
  it('uses latest detail issue owner information in issue grouped rows', () => {
    const issueId = 'issue-sts-corrosion-test';
    const data = {
      ...seedData,
      issueGroups: seedData.issueGroups.map((issue) =>
        issue.id === issueId
          ? {
              ...issue,
              ownerName: undefined,
              ownerResearchGroup: undefined,
            }
          : issue,
      ),
      detailIssues: seedData.detailIssues.map((detailIssue) =>
        detailIssue.issueGroupId === issueId
          ? {
              ...detailIssue,
              ownerResearchGroup: undefined,
            }
          : detailIssue,
      ),
    };

    render(
      <HistoryList
        data={data}
        detailIssues={data.detailIssues.filter((detailIssue) => detailIssue.issueGroupId === issueId)}
        entries={data.historyEntries.filter((entry) => entry.issueGroupId === issueId)}
        issues={data.issueGroups.filter((issue) => issue.id === issueId)}
        onSelectEntry={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '이슈별 모음' }));

    expect(screen.getByText('박연구 · 강종솔루션연구그룹')).toBeTruthy();
    expect(screen.queryByText(/담당자 미정|담당부서 미정/)).toBeNull();
  });
});
