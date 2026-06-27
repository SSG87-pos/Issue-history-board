import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { seedData } from '../domain/seedData';
import type { IssueBoardData } from '../domain/types';
import { AdminPage } from './AdminPage';

describe('AdminPage', () => {
  it('activates admin modules and updates category labels through board data', () => {
    const handleChangeData = vi.fn();
    const props = {
      data: seedData,
      onImportJson: vi.fn(),
      onImportXlsx: vi.fn(),
      onReset: vi.fn(),
      onChangeData: handleChangeData,
    } as any;

    render(<AdminPage {...props} />);

    fireEvent.click(screen.getByRole('button', { name: '분류 관리' }));

    expect(screen.getByRole('button', { name: '분류 관리' }).getAttribute('aria-pressed')).toBe('true');

    fireEvent.change(screen.getByLabelText('대분류명 강종/제품'), { target: { value: '강종/제품군' } });

    expect(handleChangeData).toHaveBeenCalledWith(
      expect.objectContaining({
        categories: expect.arrayContaining([expect.objectContaining({ id: 'grade-product', label: '강종/제품군' })]),
      }),
    );
  });

  it('updates owner fields from the owner management section', () => {
    const handleChangeData = vi.fn();
    const props = {
      data: seedData,
      onImportJson: vi.fn(),
      onImportXlsx: vi.fn(),
      onReset: vi.fn(),
      onChangeData: handleChangeData,
    } as any;

    render(<AdminPage {...props} />);

    fireEvent.click(screen.getByRole('button', { name: '담당 정보 관리' }));
    fireEvent.change(screen.getByLabelText('염수 분무 조건 편차 확인 담당자'), { target: { value: '최담당' } });

    expect(handleChangeData).toHaveBeenCalledWith(
      expect.objectContaining({
        issueGroups: expect.arrayContaining([
          expect.objectContaining({ id: 'issue-sts-corrosion-test', ownerName: '최담당' }),
        ]),
        detailIssues: expect.arrayContaining([
          expect.objectContaining({ id: 'detail-sts-corrosion-test-condition', ownerName: '최담당' }),
        ]),
      }),
    );
  });

  it('updates issue and detail master fields from the owner management section', () => {
    const handleChangeData = vi.fn();
    const props = {
      data: seedData,
      onImportJson: vi.fn(),
      onImportXlsx: vi.fn(),
      onReset: vi.fn(),
      onChangeData: handleChangeData,
    } as any;

    render(<AdminPage {...props} />);

    fireEvent.click(screen.getByRole('button', { name: '담당 정보 관리' }));
    fireEvent.change(screen.getByLabelText('염수 분무 조건 편차 확인 이슈명'), { target: { value: 'STS 조건 편차 관리' } });
    expect(handleChangeData).toHaveBeenCalledWith(
      expect.objectContaining({
        issueGroups: expect.arrayContaining([
          expect.objectContaining({ id: 'issue-sts-corrosion-test', title: 'STS 조건 편차 관리' }),
        ]),
      }),
    );

    fireEvent.change(screen.getByLabelText('염수 분무 조건 편차 확인 업무 라벨'), { target: { value: '조건편차' } });
    expect(handleChangeData).toHaveBeenCalledWith(
      expect.objectContaining({
        issueGroups: expect.arrayContaining([
          expect.objectContaining({ id: 'issue-sts-corrosion-test', groupLabel: '조건편차' }),
        ]),
      }),
    );

    fireEvent.change(screen.getByLabelText('염수 분무 조건 편차 확인 세부 항목명'), { target: { value: '시험 조건 편차' } });
    expect(handleChangeData).toHaveBeenCalledWith(
      expect.objectContaining({
        detailIssues: expect.arrayContaining([
          expect.objectContaining({ id: 'detail-sts-corrosion-test-condition', title: '시험 조건 편차' }),
        ]),
      }),
    );

    fireEvent.change(screen.getByLabelText('염수 분무 조건 편차 확인 대표 단계'), { target: { value: 'closed' } });
    expect(handleChangeData).toHaveBeenCalledWith(
      expect.objectContaining({
        issueGroups: expect.arrayContaining([
          expect.objectContaining({ id: 'issue-sts-corrosion-test', status: 'resolved', statusSource: 'manual' }),
        ]),
        detailIssues: expect.arrayContaining([
          expect.objectContaining({ id: 'detail-sts-corrosion-test-condition', status: 'resolved' }),
        ]),
      }),
    );
  });

  it('shows older detail cards in owner management instead of limiting to the latest rows', () => {
    const props = {
      data: seedData,
      onImportJson: vi.fn(),
      onImportXlsx: vi.fn(),
      onReset: vi.fn(),
      onChangeData: vi.fn(),
    } as any;

    render(<AdminPage {...props} />);

    fireEvent.click(screen.getByRole('button', { name: '담당 정보 관리' }));

    expect(screen.getByLabelText('압연 조건 변경 후 재발 확인 담당자')).toBeTruthy();
  });

  it('uses the stat cards as shortcuts to related admin modules', () => {
    const props = {
      data: seedData,
      onImportJson: vi.fn(),
      onImportXlsx: vi.fn(),
      onReset: vi.fn(),
      onChangeData: vi.fn(),
    } as any;

    render(<AdminPage {...props} />);

    fireEvent.click(screen.getByRole('button', { name: /이슈 \/ 세부 카드/ }));
    expect(screen.getByRole('button', { name: /이슈 \/ 세부 카드/ }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: '담당 정보 관리' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByLabelText('염수 분무 조건 편차 확인 담당자')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /대분류 \/ 하위 주제/ }));
    expect(screen.getByRole('button', { name: /대분류 \/ 하위 주제/ }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: '분류 관리' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByLabelText('대분류명 강종/제품')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /데이터 .*건 내보내기와 가져오기 보기/ }));
    expect(screen.getByRole('button', { name: /데이터 .*건 내보내기와 가져오기 보기/ }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: '데이터 관리' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('region', { name: '데이터 관리' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Excel 내보내기' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /옵션 .*개 표시명과 후보 관리 보기/ }));
    expect(screen.getByRole('button', { name: /옵션 .*개 표시명과 후보 관리 보기/ }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: '옵션 관리' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('region', { name: '옵션 관리' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '권한 관리 사용자 추가와 역할 변경 보기' }));
    expect(screen.getByRole('button', { name: '권한 관리' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('region', { name: '권한 관리' })).toBeTruthy();
  });

  it('opens report presets from the report template module', () => {
    const handleOpenReport = vi.fn();
    const props = {
      data: seedData,
      onImportJson: vi.fn(),
      onImportXlsx: vi.fn(),
      onReset: vi.fn(),
      onChangeData: vi.fn(),
      onOpenReport: handleOpenReport,
    } as any;

    render(<AdminPage {...props} />);

    fireEvent.click(screen.getByRole('button', { name: /이력 .*건 보고서 양식 보기/ }));
    expect(screen.getByRole('button', { name: '보고서 양식' }).getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: /강종\/제품 \/ STS/ }));

    expect(handleOpenReport).toHaveBeenCalledWith({ categoryId: 'grade-product', subtopicId: 'sts' });
  });

  it('filters owner rows by phase from the phase dashboard', () => {
    const props = {
      data: seedData,
      onImportJson: vi.fn(),
      onImportXlsx: vi.fn(),
      onReset: vi.fn(),
      onChangeData: vi.fn(),
    } as any;

    render(<AdminPage {...props} />);

    fireEvent.click(screen.getByRole('button', { name: '담당 정보 관리' }));
    expect(screen.getByLabelText('압연 조건 변경 후 재발 확인 담당자')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /진행.*건/ }));

    expect(screen.getByLabelText('염수 분무 조건 편차 확인 담당자')).toBeTruthy();
    expect(screen.queryByLabelText('압연 조건 변경 후 재발 확인 담당자')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /전체 단계 보기/ }));
    expect(screen.getByLabelText('압연 조건 변경 후 재발 확인 담당자')).toBeTruthy();
  });

  it('keeps connected owner fields when editing owner cells in sequence', () => {
    let latestData: IssueBoardData = seedData;

    function StatefulAdminPage() {
      const [boardData, setBoardData] = useState(seedData);

      return (
        <AdminPage
          data={boardData}
          onImportJson={vi.fn()}
          onImportXlsx={vi.fn()}
          onReset={vi.fn()}
          onChangeData={(nextData) => {
            latestData = nextData;
            setBoardData(nextData);
          }}
        />
      );
    }

    render(<StatefulAdminPage />);

    fireEvent.click(screen.getByRole('button', { name: '담당 정보 관리' }));
    fireEvent.change(screen.getByLabelText('염수 분무 조건 편차 확인 담당자'), { target: { value: '최담당' } });
    fireEvent.change(screen.getByLabelText('염수 분무 조건 편차 확인 담당부서'), { target: { value: '연결검증팀' } });

    expect(latestData.detailIssues).toContainEqual(
      expect.objectContaining({
        id: 'detail-sts-corrosion-test-condition',
        ownerName: '최담당',
        ownerResearchGroup: '연결검증팀',
        relatedDepartment: '분석시험센터',
      }),
    );
    expect(latestData.issueGroups).toContainEqual(
      expect.objectContaining({
        id: 'issue-sts-corrosion-test',
        ownerName: '최담당',
        ownerResearchGroup: '연결검증팀',
        relatedDepartment: '분석시험센터',
      }),
    );
  });

  it('updates display options and issue label candidates from option management', () => {
    const handleChangeData = vi.fn();
    const props = {
      data: seedData,
      onImportJson: vi.fn(),
      onImportXlsx: vi.fn(),
      onReset: vi.fn(),
      onChangeData: handleChangeData,
    } as any;

    render(<AdminPage {...props} />);

    fireEvent.click(screen.getByRole('button', { name: '옵션 관리' }));
    expect(screen.getByText(/세부 단계와 유형은 상태색과 데이터 호환성을 유지하기 위해 표시명, 순서, 숨김으로 운영합니다/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText('세부 단계 조치중'), { target: { value: '조치 진행' } });
    expect(handleChangeData).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: expect.objectContaining({
          statusLabels: expect.objectContaining({ actioning: '조치 진행' }),
        }),
      }),
    );

    fireEvent.change(screen.getByLabelText('유형 조치'), { target: { value: '액션' } });
    expect(handleChangeData).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: expect.objectContaining({
          recordTypeLabels: expect.objectContaining({ action: '액션' }),
        }),
      }),
    );

    fireEvent.change(screen.getByLabelText('새 업무 라벨'), { target: { value: '신규운영라벨' } });
    fireEvent.click(screen.getByRole('button', { name: '추가' }));
    expect(handleChangeData).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: expect.objectContaining({
          labelOptions: expect.arrayContaining(['신규운영라벨']),
        }),
      }),
    );
  });

  it('reorders and removes configured issue label candidates separately from labels already in use', () => {
    const handleChangeData = vi.fn();
    render(
      <AdminPage
        data={{
          ...seedData,
          settings: {
            labelOptions: ['첫번째', '두번째'],
          },
        }}
        onImportJson={vi.fn()}
        onImportXlsx={vi.fn()}
        onReset={vi.fn()}
        onChangeData={handleChangeData}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '옵션 관리' }));

    expect((screen.getByLabelText('업무 라벨 첫번째') as HTMLInputElement).value).toBe('첫번째');
    expect(screen.getByRole('group', { name: '사용 중인 업무 라벨' }).textContent).toContain('시험조건');
    expect(screen.queryByRole('button', { name: '시험조건 후보 삭제' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '두번째 위로 이동' }));
    expect(handleChangeData).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: expect.objectContaining({
          labelOptions: ['두번째', '첫번째'],
        }),
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: '첫번째 후보 삭제' }));
    expect(handleChangeData).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: expect.objectContaining({
          labelOptions: ['두번째'],
        }),
      }),
    );
  });

  it('reorders and hides status and record type candidates from option management', () => {
    const handleChangeData = vi.fn();
    render(
      <AdminPage
        data={seedData}
        onImportJson={vi.fn()}
        onImportXlsx={vi.fn()}
        onReset={vi.fn()}
        onChangeData={handleChangeData}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '옵션 관리' }));

    fireEvent.click(screen.getByRole('button', { name: '조치중 위로 이동' }));
    expect(handleChangeData).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: expect.objectContaining({
          statusOrder: ['occurred', 'actioning', 'cause_review', 'verification', 'resolved', 'on_hold'],
        }),
      }),
    );

    fireEvent.click(screen.getByRole('checkbox', { name: '원인검토 표시' }));
    expect(handleChangeData).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: expect.objectContaining({
          hiddenStatuses: ['cause_review'],
        }),
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: '조치 위로 이동' }));
    expect(handleChangeData).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: expect.objectContaining({
          recordTypeOrder: ['meeting', 'test', 'analysis', 'action', 'report', 'approval', 'customer', 'other'],
        }),
      }),
    );

    fireEvent.click(screen.getByRole('checkbox', { name: '회의 표시' }));
    expect(handleChangeData).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: expect.objectContaining({
          hiddenRecordTypes: ['meeting'],
        }),
      }),
    );
  });
});
