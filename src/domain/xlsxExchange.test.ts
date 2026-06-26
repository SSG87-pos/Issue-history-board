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

  it('updates an existing history entry when the exported id is present', () => {
    const target = seedData.historyEntries[0];
    const exported = exportBoardDataAsXlsx(seedData);
    const imported = importBoardDataFromXlsx(seedData, exported.buffer as ArrayBuffer);
    const updated = imported.historyEntries.find((entry) => entry.id === target.id);

    expect(imported.historyEntries).toHaveLength(seedData.historyEntries.length);
    expect(updated?.summary).toBe(target.summary);
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
