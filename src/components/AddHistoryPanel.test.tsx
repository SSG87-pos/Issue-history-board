import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DetailIssue, HistoryEntry, IssueGroup } from '../domain/types';
import { seedData } from '../domain/seedData';
import { AddHistoryPanel } from './AddHistoryPanel';

describe('AddHistoryPanel', () => {
  it('keeps record type optional with a plain unselected checkbox beside the label', () => {
    const handleAddEntry = vi.fn();
    render(
      <AddHistoryPanel
        data={seedData}
        categoryId="grade-product"
        subtopicId="sts"
        initialIssueGroupId="issue-sts-corrosion-test"
        onAddEntry={handleAddEntry}
        onClose={vi.fn()}
      />,
    );

    expect(screen.queryByText('이슈 대표 상태')).toBeNull();
    expect(screen.queryByText('이슈 반영')).toBeNull();

    fireEvent.click(screen.getByRole('checkbox', { name: '미선택' }));
    fireEvent.change(screen.getByLabelText('요약'), { target: { value: '선택 유형 없이 기록' } });
    fireEvent.click(screen.getByRole('button', { name: '이력 추가' }));

    const [, , entry] = handleAddEntry.mock.calls[0] as [IssueGroup, DetailIssue, HistoryEntry];
    expect(entry.recordType).toBeUndefined();
  });

  it('preserves an unselected record type when editing an existing general entry', () => {
    const handleUpdateEntry = vi.fn();
    const editingEntry = seedData.historyEntries.find((entry) => entry.id === 'hist-sts-corrosion-review');
    expect(editingEntry?.recordType).toBeUndefined();

    render(
      <AddHistoryPanel
        data={seedData}
        categoryId="grade-product"
        subtopicId="sts"
        editingEntry={editingEntry}
        onAddEntry={vi.fn()}
        onUpdateEntry={handleUpdateEntry}
        onClose={vi.fn()}
      />,
    );

    expect((screen.getByRole('checkbox', { name: '미선택' }) as HTMLInputElement).checked).toBe(true);

    fireEvent.change(screen.getByLabelText('요약'), { target: { value: '일반 기록 편집 저장' } });
    fireEvent.click(screen.getByRole('button', { name: '이력 수정 저장' }));

    const [updatedEntry] = handleUpdateEntry.mock.calls[0] as [HistoryEntry];
    expect(updatedEntry.summary).toBe('일반 기록 편집 저장');
    expect(updatedEntry.recordType).toBeUndefined();
  });

  it('uses configured record type labels and issue label candidates', () => {
    const data = {
      ...seedData,
      settings: {
        recordTypeLabels: { action: '액션 기록' },
        labelOptions: ['신규운영라벨'],
      },
    };

    render(
      <AddHistoryPanel
        data={data}
        categoryId="grade-product"
        subtopicId="sts"
        initialIssueGroupId="issue-sts-corrosion-test"
        onAddEntry={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: '액션 기록' })).toBeTruthy();
    fireEvent.click(screen.getByRole('checkbox', { name: '새 이슈로 기록' }));
    expect(document.querySelector('datalist#issue-label-options option[value="신규운영라벨"]')).toBeTruthy();
  });

  it('uses configured status and record type candidate visibility', () => {
    render(
      <AddHistoryPanel
        data={{
          ...seedData,
          settings: {
            statusOrder: ['actioning', 'verification', 'cause_review', 'on_hold', 'occurred', 'resolved'],
            hiddenStatuses: ['cause_review'],
            recordTypeOrder: ['action', 'other', 'meeting', 'test', 'analysis', 'report', 'approval', 'customer'],
            hiddenRecordTypes: ['meeting'],
          },
        }}
        categoryId="grade-product"
        subtopicId="sts"
        initialIssueGroupId="issue-sts-corrosion-test"
        onAddEntry={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const detailStatusGroup = screen.getByRole('group', { name: '세부 항목 상태' });
    expect(detailStatusGroup.querySelectorAll('button')[0]?.textContent).toBe('조치중');
    expect(screen.queryByRole('button', { name: '원인검토' })).toBeNull();

    const recordTypeGroup = screen.getByRole('group', { name: '유형' });
    expect(recordTypeGroup.querySelectorAll('button')[0]?.textContent).toBe('조치');
    expect(screen.queryByRole('button', { name: '회의' })).toBeNull();
  });
});
