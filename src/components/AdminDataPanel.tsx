import { Download, RotateCcw, Upload } from 'lucide-react';
import { serializeBoardData } from '../domain/persistence';
import type { IssueBoardData } from '../domain/types';

type AdminDataPanelProps = {
  data: IssueBoardData;
  onImportJson: (json: string) => void;
  onReset: () => void;
};

export function AdminDataPanel({ data, onImportJson, onReset }: AdminDataPanelProps) {
  function exportJson() {
    const blob = new Blob([serializeBoardData(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `research-issue-board-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="admin-panel" aria-label="데이터 관리">
      <div>
        <h2>데이터 관리</h2>
        <p>로컬 MVP 데이터는 브라우저에 저장됩니다. 민감 정보 내보내기는 직접 실행할 때만 진행됩니다.</p>
      </div>
      <div className="admin-actions">
        <button type="button" onClick={exportJson}>
          <Download size={15} />
          JSON 내보내기
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
        <button type="button" onClick={onReset}>
          <RotateCcw size={15} />
          초기 데이터
        </button>
      </div>
    </section>
  );
}
