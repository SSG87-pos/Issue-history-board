import { describe, expect, it } from 'vitest';
import { seedData } from './seedData';
import { deserializeBoardData, loadBoardData, resetBoardData, serializeBoardData } from './persistence';

function memoryStorage(initial?: string): Storage {
  const values = new Map<string, string>();
  if (initial) values.set('research-issue-board-data', initial);
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe('persistence serialization', () => {
  it('round-trips board data as formatted JSON', () => {
    const json = serializeBoardData(seedData);
    const parsed = deserializeBoardData(json);

    expect(json).toContain('\n  "categories"');
    expect(parsed.issueGroups[0].title).toBe('STS-430 표면 결함 재발');
  });

  it('preserves admin-configured display options when normalizing saved data', () => {
    const parsed = deserializeBoardData(
      serializeBoardData({
        ...seedData,
        settings: {
          statusLabels: { actioning: '조치 진행' },
          recordTypeLabels: { action: '액션 기록' },
          statusOrder: ['actioning', 'cause_review', 'verification', 'on_hold', 'occurred', 'resolved'],
          hiddenStatuses: ['cause_review'],
          recordTypeOrder: ['action', 'other', 'meeting', 'test', 'analysis', 'report', 'approval', 'customer'],
          hiddenRecordTypes: ['meeting'],
          labelOptions: ['신규운영라벨'],
          reportHtmlTemplate: '<html>{{issueCards}}</html>',
          reportHtmlTemplateName: 'team-report.html',
        },
      }),
    );

    expect(parsed.settings?.statusLabels?.actioning).toBe('조치 진행');
    expect(parsed.settings?.recordTypeLabels?.action).toBe('액션 기록');
    expect(parsed.settings?.statusOrder?.[0]).toBe('actioning');
    expect(parsed.settings?.hiddenStatuses).toContain('cause_review');
    expect(parsed.settings?.recordTypeOrder?.[0]).toBe('action');
    expect(parsed.settings?.hiddenRecordTypes).toContain('meeting');
    expect(parsed.settings?.labelOptions).toContain('신규운영라벨');
    expect(parsed.settings?.reportHtmlTemplate).toContain('{{issueCards}}');
    expect(parsed.settings?.reportHtmlTemplateName).toBe('team-report.html');
  });

  it('starts and resets with empty board data when no saved data exists', () => {
    const storage = memoryStorage();

    expect(loadBoardData(storage).categories).toHaveLength(0);
    expect(loadBoardData(storage).subtopics).toHaveLength(0);

    storage.setItem('research-issue-board-data', serializeBoardData(seedData));
    expect(loadBoardData(storage).categories.length).toBeGreaterThan(0);
    expect(resetBoardData(storage).categories).toHaveLength(0);
    expect(storage.getItem('research-issue-board-data')).toBeNull();
  });

  it('rejects data that does not contain required arrays', () => {
    expect(() => deserializeBoardData('{"categories":[]}')).toThrow('Invalid issue board data');
  });
});
