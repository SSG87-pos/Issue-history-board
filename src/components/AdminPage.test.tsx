import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { seedData } from '../domain/seedData';
import { AdminPage } from './AdminPage';

function renderAdminPage(overrides = {}) {
  return render(
    <AdminPage
      data={seedData}
      onImportJson={vi.fn()}
      onImportXlsx={vi.fn()}
      onReset={vi.fn()}
      onChangeData={vi.fn()}
      {...overrides}
    />,
  );
}

describe('AdminPage', () => {
  it('keeps the admin module tabs focused on classification, options, permissions, and report shortcuts', () => {
    renderAdminPage();

    expect(screen.getByRole('button', { name: /분류 관리/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /옵션 관리/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /권한 관리/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /보고서 바로가기/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /담당 정보 관리/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /데이터 관리/ })).toBeNull();
  });

  it('updates and adds classification items through board data', () => {
    const handleChangeData = vi.fn();
    renderAdminPage({ onChangeData: handleChangeData });

    expect(screen.getByRole('tab', { name: /강종\/제품/ })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /투자\/과제/ })).toBeTruthy();

    fireEvent.change(screen.getByLabelText('대분류명 강종/제품'), { target: { value: '강종/제품군' } });
    expect(handleChangeData).toHaveBeenCalledWith(
      expect.objectContaining({
        categories: expect.arrayContaining([expect.objectContaining({ id: 'grade-product', label: '강종/제품군' })]),
      }),
    );

    fireEvent.click(screen.getByRole('switch', { name: 'HPF 보임 상태' }));
    expect(handleChangeData).toHaveBeenCalledWith(
      expect.objectContaining({
        subtopics: expect.arrayContaining([expect.objectContaining({ id: 'hpf', hidden: true })]),
      }),
    );

    fireEvent.change(screen.getByLabelText('새 대분류'), { target: { value: '품질/인증' } });
    fireEvent.click(screen.getByRole('button', { name: /대분류 추가/ }));
    expect(handleChangeData).toHaveBeenCalledWith(
      expect.objectContaining({
        categories: expect.arrayContaining([expect.objectContaining({ id: 'category-품질-인증', label: '품질/인증' })]),
      }),
    );

    fireEvent.change(screen.getByLabelText('강종/제품 하위 주제 추가'), { target: { value: '신규 STS' } });
    fireEvent.click(screen.getAllByRole('button', { name: /하위 주제 추가/ })[0]);
    expect(handleChangeData).toHaveBeenCalledWith(
      expect.objectContaining({
        subtopics: expect.arrayContaining([
          expect.objectContaining({ id: 'subtopic-신규-sts', categoryId: 'grade-product', label: '신규 STS' }),
        ]),
      }),
    );
  });

  it('shows option management as tabbed sub-sections with visible phase and switches', () => {
    const handleChangeData = vi.fn();
    const { container } = renderAdminPage({ onChangeData: handleChangeData });

    fireEvent.click(screen.getByRole('button', { name: /옵션 관리/ }));
    expect(screen.getByRole('region', { name: '옵션 관리' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /세부 단계/ })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /유형/ })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /업무 라벨/ })).toBeTruthy();
    expect(screen.getByLabelText('조치중 대표 단계').textContent).toContain('진행');
    expect(Array.from(container.querySelectorAll('.admin-option-phase-section > header strong')).map((node) => node.textContent)).toEqual([
      '접수',
      '진행',
      '종료',
    ]);

    fireEvent.change(screen.getByLabelText('세부 단계 조치중'), { target: { value: '조치 진행' } });
    expect(handleChangeData).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: expect.objectContaining({
          statusLabels: expect.objectContaining({ actioning: '조치 진행' }),
        }),
      }),
    );

    fireEvent.click(screen.getByRole('switch', { name: '조치중 보임 상태' }));
    expect(handleChangeData).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: expect.objectContaining({
          hiddenStatuses: expect.arrayContaining(['actioning']),
        }),
      }),
    );

    fireEvent.change(screen.getByLabelText('새 세부 단계'), { target: { value: '후속검토' } });
    fireEvent.change(screen.getByLabelText('새 세부 단계 대표 단계'), { target: { value: 'closed' } });
    fireEvent.click(screen.getByRole('button', { name: /세부 단계 추가/ }));
    expect(handleChangeData).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: expect.objectContaining({
          customStatuses: expect.arrayContaining([
            expect.objectContaining({ id: 'custom-status-후속검토', label: '후속검토', phase: 'closed' }),
          ]),
        }),
      }),
    );

    fireEvent.click(screen.getByRole('tab', { name: /유형/ }));
    fireEvent.change(screen.getByLabelText('새 유형'), { target: { value: '현장점검' } });
    fireEvent.click(screen.getByRole('button', { name: /유형 추가/ }));
    expect(handleChangeData).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: expect.objectContaining({
          customRecordTypes: expect.arrayContaining([
            expect.objectContaining({ id: 'custom-record-현장점검', label: '현장점검' }),
          ]),
        }),
      }),
    );

    fireEvent.click(screen.getByRole('tab', { name: /업무 라벨/ }));
    fireEvent.change(screen.getByLabelText('새 업무 라벨'), { target: { value: '신규운영라벨' } });
    fireEvent.click(screen.getByRole('button', { name: /라벨 추가/ }));
    expect(handleChangeData).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: expect.objectContaining({
          labelOptions: expect.arrayContaining(['신규운영라벨']),
        }),
      }),
    );
  });

  it('opens report presets and manages HTML report templates from the report shortcut module', async () => {
    const handleOpenReport = vi.fn();
    const handleChangeData = vi.fn();
    renderAdminPage({ onChangeData: handleChangeData, onOpenReport: handleOpenReport });

    fireEvent.click(screen.getByRole('button', { name: /보고서 바로가기/ }));
    expect(screen.getByRole('region', { name: '보고서 바로가기' })).toBeTruthy();
    expect(screen.getByLabelText('HTML 템플릿 토큰').textContent).toContain('{{issueCards}}');

    const file = new File(['<html><body>{{reportTitle}}{{issueCards}}</body></html>'], 'team-report.html', {
      type: 'text/html',
    });
    fireEvent.change(screen.getByLabelText('템플릿 업로드'), { target: { files: [file] } });
    await waitFor(() =>
      expect(handleChangeData).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({
            reportHtmlTemplate: '<html><body>{{reportTitle}}{{issueCards}}</body></html>',
            reportHtmlTemplateName: 'team-report.html',
          }),
        }),
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: /강종\/제품 \/ STS/ }));

    expect(handleOpenReport).toHaveBeenCalledWith({ categoryId: 'grade-product', subtopicId: 'sts' });
  });
});
