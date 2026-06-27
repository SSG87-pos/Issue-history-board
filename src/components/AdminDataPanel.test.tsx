import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { seedData } from '../domain/seedData';
import { AdminDataPanel } from './AdminDataPanel';

describe('AdminDataPanel', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('exports JSON and Excel files with the expected download metadata', () => {
    const downloadLinks: HTMLAnchorElement[] = [];
    const originalCreateElement = document.createElement.bind(document);

    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:admin-export'),
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
      <AdminDataPanel
        data={seedData}
        onImportJson={vi.fn()}
        onImportXlsx={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'JSON 내보내기' }));
    fireEvent.click(screen.getByRole('button', { name: 'Excel 내보내기' }));

    expect(downloadLinks[0].download).toMatch(/^research-issue-board-\d{4}-\d{2}-\d{2}\.json$/);
    expect(downloadLinks[1].download).toMatch(/^research-issue-board-history-\d{4}-\d{2}-\d{2}\.xlsx$/);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:admin-export');
  });

  it('passes imported JSON and Excel file contents to the app handlers', async () => {
    const handleImportJson = vi.fn();
    const handleImportXlsx = vi.fn();
    const xlsxBytes = new Uint8Array([80, 75, 3, 4]);

    render(
      <AdminDataPanel
        data={seedData}
        onImportJson={handleImportJson}
        onImportXlsx={handleImportXlsx}
        onReset={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('JSON 가져오기'), {
      target: { files: [new File(['{"categories":[]}'], 'board.json', { type: 'application/json' })] },
    });
    fireEvent.change(screen.getByLabelText('Excel 가져오기'), {
      target: {
        files: [
          new File([xlsxBytes], 'board.xlsx', {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          }),
        ],
      },
    });

    await waitFor(() => expect(handleImportJson).toHaveBeenCalledWith('{"categories":[]}'));
    await waitFor(() => expect(handleImportXlsx).toHaveBeenCalledTimes(1));
    expect([...new Uint8Array(handleImportXlsx.mock.calls[0][0])]).toEqual([...xlsxBytes]);
  });
});
