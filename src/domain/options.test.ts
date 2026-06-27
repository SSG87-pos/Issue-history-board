import { describe, expect, it } from 'vitest';
import { getIssueLabelOptions, getRecordTypeOptions, getStatusOptionsForPhase } from './options';
import { seedData } from './seedData';
import type { IssueBoardData } from './types';

describe('option helpers', () => {
  it('keeps configured issue label candidates first and in admin order', () => {
    const labels = getIssueLabelOptions({
      ...seedData,
      settings: {
        labelOptions: ['두번째', '첫번째', '시험조건'],
      },
    });

    expect(labels.slice(0, 3)).toEqual(['두번째', '첫번째', '시험조건']);
    expect(labels.filter((label) => label === '시험조건')).toHaveLength(1);
  });

  it('orders and hides status and record type candidates while keeping current selections available', () => {
    const data: IssueBoardData = {
      ...seedData,
      settings: {
        statusOrder: ['actioning', 'cause_review', 'verification', 'on_hold', 'occurred', 'resolved'],
        hiddenStatuses: ['cause_review'],
        recordTypeOrder: ['action', 'meeting', 'other', 'test', 'analysis', 'report', 'approval', 'customer'],
        hiddenRecordTypes: ['meeting'],
      },
    };

    expect(getStatusOptionsForPhase(data, 'in_progress')).toEqual(['actioning', 'verification', 'on_hold']);
    expect(getStatusOptionsForPhase(data, 'in_progress', 'cause_review')).toEqual([
      'actioning',
      'verification',
      'on_hold',
      'cause_review',
    ]);
    expect(getRecordTypeOptions(data)).toEqual(['action', 'other', 'test', 'analysis', 'report', 'approval', 'customer']);
    expect(getRecordTypeOptions(data, 'meeting')).toEqual([
      'action',
      'other',
      'test',
      'analysis',
      'report',
      'approval',
      'customer',
      'meeting',
    ]);
  });
});
