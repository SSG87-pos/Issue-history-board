import { Download, RotateCcw, Upload } from 'lucide-react';
import { serializeBoardData } from '../domain/persistence';
import type { IssueBoardData } from '../domain/types';
import { exportBoardDataAsXlsx } from '../domain/xlsxExchange';

type AdminDataPanelProps = {
  data: IssueBoardData;
  onImportJson: (json: string) => void;
  onImportXlsx: (file: ArrayBuffer) => void;
  onReset: () => void;
};

export function AdminDataPanel({ data, onImportJson, onImportXlsx, onReset }: AdminDataPanelProps) {
  function exportJson() {
    const blob = new Blob([serializeBoardData(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `research-issue-board-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportXlsx() {
    const bytes = exportBoardDataAsXlsx(data);
    const fileBody = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const blob = new Blob([fileBody], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `research-issue-board-history-${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="admin-panel admin-panel--data-management" aria-label="데이터 관리">
      <div>
        <h2>데이터 관리</h2>
      </div>
      <div className="admin-actions">
        <button type="button" onClick={exportJson}>
          <Download size={15} />
          JSON 내보내기
        </button>
        <button type="button" onClick={exportXlsx}>
          <Download size={15} />
          Excel 내보내기
        </button>
        <label className="file-button">
          <Upload size={15} />
          JSON 가져오기
          <input
            type="file"
            accept="application/json"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              onImportJson(await file.text());
              event.target.value = '';
            }}
          />
        </label>
        <label className="file-button">
          <Upload size={15} />
          Excel 가져오기
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              onImportXlsx(await file.arrayBuffer());
              event.target.value = '';
            }}
          />
        </label>
        <button type="button" onClick={onReset}>
          <RotateCcw size={15} />
          초기 데이터
        </button>
      </div>
    </section>
  );
}
