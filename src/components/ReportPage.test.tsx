import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { seedData } from '../domain/seedData';
import { ReportPage } from './ReportPage';

describe('ReportPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('downloads filtered Excel, HTML, and Word reports from the selected scope', () => {
    const downloadLinks: HTMLAnchorElement[] = [];
    const originalCreateElement = document.createElement.bind(document);

    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:report-export'),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string, options?: ElementCreationOptions) => {
      const element = originalCreateElement(tagName, options);
      if (tagName.toLowerCase() === 'a') {
        downloadLinks.push(element as HTMLAnchorElement);
        (element as HTMLAnchorElement).click = vi.fn();
      }
      return element;
    }) as typeof document.createElement);

    render(
      <ReportPage
        data={seedData}
        onImportJson={vi.fn()}
        onImportXlsx={vi.fn()}
        onReset={vi.fn()}
        canManageData={false}
      />,
    );

    fireEvent.change(screen.getByLabelText('하위 주제'), { target: { value: 'sts' } });
    fireEvent.click(screen.getByRole('button', { name: 'Excel 다운로드' }));
    fireEvent.click(screen.getByRole('button', { name: 'HTML 보고서' }));
    fireEvent.click(screen.getByRole('button', { name: 'Word 보고서' }));

    expect(downloadLinks[0].download).toMatch(/^STS_이력_보고서-\d{4}-\d{2}-\d{2}\.xlsx$/);
    expect(downloadLinks[1].download).toMatch(/^STS_이력_보고서-\d{4}-\d{2}-\d{2}\.html$/);
    expect(downloadLinks[2].download).toMatch(/^STS_이력_보고서-\d{4}-\d{2}-\d{2}\.docx$/);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(3);
  });

  it('shows data import and export controls only for users who can manage data', () => {
    const props = {
      data: seedData,
      onImportJson: vi.fn(),
      onImportXlsx: vi.fn(),
      onReset: vi.fn(),
    };
    const { rerender } = render(<ReportPage {...props} canManageData={false} />);

    expect(screen.queryByRole('region', { name: '데이터 관리' })).toBeNull();

    rerender(<ReportPage {...props} canManageData />);

    expect(screen.getByRole('region', { name: '데이터 관리' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Excel 내보내기' })).toBeTruthy();
  });

  it('applies report filter presets from admin shortcuts', () => {
    const props = {
      data: seedData,
      onImportJson: vi.fn(),
      onImportXlsx: vi.fn(),
      onReset: vi.fn(),
      canManageData: false,
    };
    const { rerender } = render(
      <ReportPage
        {...props}
        filterPreset={{ nonce: 1, categoryId: 'grade-product', subtopicId: 'sts' }}
      />,
    );

    expect((screen.getByLabelText('대분류') as HTMLSelectElement).value).toBe('grade-product');
    expect((screen.getByLabelText('하위 주제') as HTMLSelectElement).value).toBe('sts');

    rerender(
      <ReportPage
        {...props}
        filterPreset={{ nonce: 2, categoryId: 'investment-project', subtopicId: 'joint-research' }}
      />,
    );

    expect((screen.getByLabelText('대분류') as HTMLSelectElement).value).toBe('investment-project');
    expect((screen.getByLabelText('하위 주제') as HTMLSelectElement).value).toBe('joint-research');
  });

  it('switches report templates without showing an inline preview list', () => {
    render(
      <ReportPage
        data={seedData}
        onImportJson={vi.fn()}
        onImportXlsx={vi.fn()}
        onReset={vi.fn()}
        canManageData={false}
      />,
    );

    fireEvent.change(screen.getByLabelText('보고서 양식'), { target: { value: 'delayed' } });

    expect((screen.getByLabelText('보고서 양식') as HTMLSelectElement).value).toBe('delayed');
    expect(screen.queryByRole('button', { name: '목록 보기' })).toBeNull();
    expect(screen.queryByLabelText('보고서 이력 목록')).toBeNull();
  });
});
