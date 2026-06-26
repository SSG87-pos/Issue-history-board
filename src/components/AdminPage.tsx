import { Database, FileText, ShieldCheck, UsersRound } from 'lucide-react';
import type { IssueBoardData, IssuePhase } from '../domain/types';
import { PHASE_LABELS, STATUS_PHASES } from '../domain/types';
import { AdminDataPanel } from './AdminDataPanel';

type AdminPageProps = {
  data: IssueBoardData;
  onImportJson: (json: string) => void;
  onImportXlsx: (file: ArrayBuffer) => void;
  onReset: () => void;
};

const PHASE_ORDER: IssuePhase[] = ['received', 'in_progress', 'closed'];

export function AdminPage({ data, onImportJson, onImportXlsx, onReset }: AdminPageProps) {
  const phaseCounts = PHASE_ORDER.map((phase) => ({
    phase,
    count: data.issueGroups.filter((issue) => STATUS_PHASES[issue.status] === phase && !issue.archived).length,
  }));
  const ownerRows = data.detailIssues
    .filter((detailIssue) => !detailIssue.archived)
    .slice()
    .sort((a, b) => b.latestUpdatedAt.localeCompare(a.latestUpdatedAt))
    .slice(0, 6)
    .map((detailIssue) => {
      const issue = data.issueGroups.find((item) => item.id === detailIssue.issueGroupId);
      return {
        id: detailIssue.id,
        title: detailIssue.title,
        issueTitle: issue?.title ?? '이슈 없음',
        ownerName: detailIssue.ownerName ?? issue?.ownerName ?? '미정',
        ownerDepartment: detailIssue.ownerResearchGroup ?? issue?.ownerResearchGroup ?? '미정',
        relatedDepartment: detailIssue.relatedDepartment ?? issue?.relatedDepartment ?? '미정',
      };
    });

  return (
    <section className="admin-page" aria-label="관리자 페이지">
      <div className="admin-page__hero">
        <div>
          <p className="breadcrumb">관리자</p>
          <h2>운영 관리</h2>
        </div>
      </div>

      <div className="admin-stat-grid" aria-label="관리 지표">
        <section>
          <Database size={18} />
          <span>대분류 / 하위 주제</span>
          <strong>{data.categories.length} / {data.subtopics.filter((subtopic) => !subtopic.hidden).length}</strong>
        </section>
        <section>
          <FileText size={18} />
          <span>이슈 / 세부 카드</span>
          <strong>{data.issueGroups.filter((issue) => !issue.archived).length} / {data.detailIssues.filter((detailIssue) => !detailIssue.archived).length}</strong>
        </section>
        <section>
          <UsersRound size={18} />
          <span>이력</span>
          <strong>{data.historyEntries.length}</strong>
        </section>
        <section>
          <ShieldCheck size={18} />
          <span>민감 이슈</span>
          <strong>{data.issueGroups.filter((issue) => issue.sensitive && !issue.archived).length}</strong>
        </section>
      </div>

      <div className="admin-layout">
        <div className="admin-layout__main">
          <AdminDataPanel data={data} onImportJson={onImportJson} onImportXlsx={onImportXlsx} onReset={onReset} />

          <section className="admin-panel admin-panel--owner-table" aria-label="담당 정보">
            <div>
              <h2>담당 정보</h2>
            </div>
            <div className="admin-owner-table">
              <div className="admin-owner-table__head">
                <span>세부 카드</span>
                <span>담당자</span>
                <span>담당부서</span>
                <span>유관부서</span>
              </div>
              {ownerRows.map((row) => (
                <div className="admin-owner-table__row" key={row.id}>
                  <span>
                    <strong>{row.title}</strong>
                    <small>{row.issueTitle}</small>
                  </span>
                  <span>{row.ownerName}</span>
                  <span>{row.ownerDepartment}</span>
                  <span>{row.relatedDepartment}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="admin-layout__side" aria-label="운영 구성">
          <section className="admin-panel admin-panel--phase">
            <div>
              <h2>단계 현황</h2>
            </div>
            <div className="admin-phase-list">
              {phaseCounts.map(({ phase, count }) => (
                <div key={phase}>
                  <span className={`status-dot-label phase-${phase}`}>{PHASE_LABELS[phase]}</span>
                  <strong>{count}건</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="admin-panel admin-panel--modules">
            <div>
              <h2>관리 메뉴</h2>
            </div>
            <div className="admin-module-list">
              <button type="button">분류 관리</button>
              <button type="button">담당 정보 관리</button>
              <button type="button">권한 관리</button>
              <button type="button">보고서 양식</button>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
