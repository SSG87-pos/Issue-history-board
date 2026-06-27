import { describe, expect, it } from 'vitest';
import { seedData } from './seedData';
import type { IssueBoardData } from './types';
import { exportBoardDataAsXlsx, importBoardDataFromXlsx } from './xlsxExchange';

describe('XLSX exchange', () => {
  it('exports history rows as a real xlsx package', () => {
    const xlsx = exportBoardDataAsXlsx(seedData);
    const signature = Array.from(xlsx.slice(0, 4)).map((byte) => byte.toString(16).padStart(2, '0')).join('');

    expect(signature).toBe('504b0304');
  });

  it('exports configured status and record type labels', () => {
    const xlsx = exportBoardDataAsXlsx({
      ...seedData,
      historyEntries: seedData.historyEntries.map((entry, index) =>
        index === 0 ? { ...entry, status: 'actioning', recordType: 'action' } : entry,
      ),
      settings: {
        statusLabels: { actioning: '조치 진행' },
        recordTypeLabels: { action: '액션 기록' },
      },
    });
    const text = new TextDecoder().decode(xlsx);

    expect(text).toContain('조치 진행');
    expect(text).toContain('액션 기록');
  });

  it('updates an existing history entry when the exported id is present', () => {
    const target = seedData.historyEntries[0];
    const exported = exportBoardDataAsXlsx(seedData);
    const imported = importBoardDataFromXlsx(seedData, exported.buffer as ArrayBuffer);
    const updated = imported.historyEntries.find((entry) => entry.id === target.id);

    expect(imported.historyEntries).toHaveLength(seedData.historyEntries.length);
    expect(updated?.summary).toBe(target.summary);
  });

  it('imports configured status and record type labels back to their canonical values', () => {
    const source = {
      ...seedData,
      historyEntries: seedData.historyEntries.map((entry, index) =>
        index === 0 ? { ...entry, status: 'actioning', recordType: 'action' } : entry,
      ),
      settings: {
        statusLabels: { actioning: '조치 진행' },
        recordTypeLabels: { action: '액션 기록' },
        statusOrder: ['actioning', 'cause_review', 'verification', 'on_hold', 'occurred', 'resolved'],
        hiddenStatuses: ['cause_review'],
        recordTypeOrder: ['action', 'other', 'meeting', 'test', 'analysis', 'report', 'approval', 'customer'],
        hiddenRecordTypes: ['meeting'],
      },
    } satisfies IssueBoardData;
    const exported = exportBoardDataAsXlsx(source);
    const imported = importBoardDataFromXlsx(source, exported.buffer as ArrayBuffer);
    const updated = imported.historyEntries.find((entry) => entry.id === seedData.historyEntries[0].id);

    expect(updated?.status).toBe('actioning');
    expect(updated?.recordType).toBe('action');
    expect(updated?.blockName).toBe('조치 진행');
    expect(imported.settings?.statusOrder?.[0]).toBe('actioning');
    expect(imported.settings?.hiddenStatuses).toContain('cause_review');
    expect(imported.settings?.recordTypeOrder?.[0]).toBe('action');
    expect(imported.settings?.hiddenRecordTypes).toContain('meeting');
  });

  it('creates missing hierarchy values from an xlsx row', () => {
    const xlsxSource: IssueBoardData = {
      categories: [{ id: 'import-category', label: '신규 대분류', description: '신규 대분류 관련 이슈', order: 1 }],
      subtopics: [{ id: 'import-subtopic', categoryId: 'import-category', label: '신규 주제', order: 1 }],
      issueGroups: [
        {
          id: 'import-issue',
          title: '신규 이슈',
          categoryId: 'import-category',
          subtopicId: 'import-subtopic',
          status: 'actioning',
          statusSource: 'auto',
          firstOccurredAt: '2026-06-26',
          latestUpdatedAt: '2026-06-26',
          currentSummary: '새 기록',
          tags: ['업무라벨'],
          groupLabel: '업무라벨',
          groupColorTone: 'neutral',
          ownerName: '관리자',
          ownerResearchGroup: '연구기획팀',
          relatedDepartment: '운영팀',
          sensitive: false,
          archived: false,
        },
      ],
      detailIssues: [
        {
          id: 'import-detail',
          issueGroupId: 'import-issue',
          title: '신규 세부',
          status: 'actioning',
          firstOccurredAt: '2026-06-26',
          latestUpdatedAt: '2026-06-26',
          currentSummary: '새 기록',
          tags: ['업무라벨'],
          archived: false,
        },
      ],
      historyEntries: [
        {
          id: 'import-row',
          issueGroupId: 'import-issue',
          detailIssueId: 'import-detail',
          date: '2026-06-26',
          status: 'actioning',
          changesDetailIssueStatus: true,
          recordType: 'meeting',
          summary: '새 기록',
          details: '상세 내용',
          remainingRisk: '향후 계획',
          blockName: '조치중',
          referenceLinks: [],
          createdAt: '2026-06-26T00:00:00.000Z',
          updatedAt: '2026-06-26T00:00:00.000Z',
        },
      ],
    };
    const xlsx = exportBoardDataAsXlsx(xlsxSource);
    const imported = importBoardDataFromXlsx(seedData, xlsx.buffer as ArrayBuffer);

    expect(imported.categories.some((category) => category.label === '신규 대분류')).toBe(true);
    expect(imported.subtopics.some((subtopic) => subtopic.label === '신규 주제')).toBe(true);
    expect(imported.issueGroups.some((issue) => issue.title === '신규 이슈')).toBe(true);
    expect(imported.detailIssues.some((detail) => detail.title === '신규 세부')).toBe(true);
    expect(imported.historyEntries.some((entry) => entry.summary === '새 기록')).toBe(true);
  });
});
