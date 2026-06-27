import { describe, expect, it } from 'vitest';
import { seedData } from './seedData';
import { deserializeBoardData, serializeBoardData } from './persistence';

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
  });

  it('rejects data that does not contain required arrays', () => {
    expect(() => deserializeBoardData('{"categories":[]}')).toThrow('Invalid issue board data');
  });
});
