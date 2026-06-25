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

  it('rejects data that does not contain required arrays', () => {
    expect(() => deserializeBoardData('{"categories":[]}')).toThrow('Invalid issue board data');
  });
});
