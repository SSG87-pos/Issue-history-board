import {
  ArrowDown,
  ArrowUp,
  Database,
  FileArchive,
  FileSpreadsheet,
  FileText,
  Settings2,
  ShieldCheck,
  Trash2,
  UsersRound,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { getIssueLabelOptions, getOrderedRecordTypes, getOrderedStatuses, getRecordTypeLabels, getStatusLabels } from '../domain/options';
import type { DetailIssue, IssueBoardData, IssueGroup, IssuePhase, IssueRecordType, IssueStatus } from '../domain/types';
import { DEFAULT_STATUS_BY_PHASE, PHASE_LABELS, RECORD_TYPE_LABELS, STATUS_LABELS, STATUS_PHASES } from '../domain/types';
import { AdminDataPanel } from './AdminDataPanel';
import { AdminUsersPanel } from './AdminUsersPanel';

type AdminPageProps = {
  data: IssueBoardData;
  onImportJson: (json: string) => void;
  onImportXlsx: (file: ArrayBuffer) => void;
  onReset: () => void;
  onChangeData?: (data: IssueBoardData) => void;
  onOpenReport?: (filters?: AdminReportFilters) => void;
  apiBaseUrl?: string;
  authToken?: string;
};

type AdminReportFilters = {
  categoryId?: string;
  subtopicId?: string;
  issueGroupId?: string;
};

const PHASE_ORDER: IssuePhase[] = ['received', 'in_progress', 'closed'];
const ADMIN_MODULES = [
  { id: 'classification', label: '분류 관리' },
  { id: 'data', label: '데이터 관리' },
  { id: 'owners', label: '담당 정보 관리' },
  { id: 'options', label: '옵션 관리' },
  { id: 'permissions', label: '권한 관리' },
  { id: 'report', label: '보고서 양식' },
] as const;

type AdminModule = (typeof ADMIN_MODULES)[number]['id'];

export function AdminPage({
  data,
  onImportJson,
  onImportXlsx,
  onReset,
  onChangeData,
  onOpenReport,
  apiBaseUrl,
  authToken,
}: AdminPageProps) {
  const [activeModule, setActiveModule] = useState<AdminModule>('classification');
  const [selectedOwnerPhase, setSelectedOwnerPhase] = useState<IssuePhase | 'all'>('all');
  const [newLabelOption, setNewLabelOption] = useState('');
  const mainPanelRef = useRef<HTMLDivElement>(null);
  const phaseCounts = PHASE_ORDER.map((phase) => ({
    phase,
    count: data.issueGroups.filter((issue) => STATUS_PHASES[issue.status] === phase && !issue.archived).length,
  }));
  const ownerRows = data.detailIssues
    .filter((detailIssue) => !detailIssue.archived)
    .slice()
    .sort((a, b) => b.latestUpdatedAt.localeCompare(a.latestUpdatedAt))
    .map((detailIssue) => {
      const issue = data.issueGroups.find((item) => item.id === detailIssue.issueGroupId);
      return {
        id: detailIssue.id,
        title: detailIssue.title,
        issueId: issue?.id,
        issueTitle: issue?.title ?? '이슈 없음',
        issueGroupLabel: issue?.groupLabel ?? '',
        phase: issue ? STATUS_PHASES[issue.status] : STATUS_PHASES[detailIssue.status],
        ownerName: detailIssue.ownerName ?? issue?.ownerName ?? '미정',
        ownerDepartment: detailIssue.ownerResearchGroup ?? issue?.ownerResearchGroup ?? '미정',
        relatedDepartment: detailIssue.relatedDepartment ?? issue?.relatedDepartment ?? '미정',
      };
    })
    .filter((row) => selectedOwnerPhase === 'all' || row.phase === selectedOwnerPhase);
  const canEditBoardData = Boolean(onChangeData);
  const statusLabels = getStatusLabels(data);
  const recordTypeLabels = getRecordTypeLabels(data);
  const orderedStatuses = getOrderedStatuses(data);
  const orderedRecordTypes = getOrderedRecordTypes(data);
  const hiddenStatuses = new Set(data.settings?.hiddenStatuses ?? []);
  const hiddenRecordTypes = new Set(data.settings?.hiddenRecordTypes ?? []);
  const labelOptions = getIssueLabelOptions(data);
  const visibleOptionCount =
    orderedStatuses.filter((status) => !hiddenStatuses.has(status)).length +
    orderedRecordTypes.filter((recordType) => !hiddenRecordTypes.has(recordType)).length +
    labelOptions.length;
  const configuredLabelOptions = (data.settings?.labelOptions ?? [])
    .map((label) => label.trim())
    .filter((label, index, labels) => label.length > 0 && labels.indexOf(label) === index);
  const derivedIssueLabels = labelOptions.filter((label) => !configuredLabelOptions.includes(label));
  const reportShortcuts = data.subtopics
    .filter((subtopic) => !subtopic.hidden)
    .map((subtopic) => {
      const category = data.categories.find((item) => item.id === subtopic.categoryId);
      const issues = data.issueGroups.filter((issue) => issue.subtopicId === subtopic.id && !issue.archived);
      const issueIds = new Set(issues.map((issue) => issue.id));
      const historyEntries = data.historyEntries.filter((entry) => issueIds.has(entry.issueGroupId));
      return {
        subtopic,
        category,
        issueCount: issues.length,
        historyCount: historyEntries.length,
        latestDate: historyEntries.map((entry) => entry.date).sort((a, b) => b.localeCompare(a))[0],
      };
    })
    .filter((row) => row.issueCount > 0 || row.historyCount > 0)
    .sort((a, b) => b.historyCount - a.historyCount || (b.latestDate ?? '').localeCompare(a.latestDate ?? ''))
    .slice(0, 6);

  function scrollActivePanelIntoView() {
    if (typeof window === 'undefined' || !window.matchMedia?.('(max-width: 1180px)').matches) return;
    window.requestAnimationFrame(() => mainPanelRef.current?.scrollIntoView({ block: 'start' }));
  }

  function activateModule(module: AdminModule) {
    setActiveModule(module);
    if (module !== 'owners') setSelectedOwnerPhase('all');
    scrollActivePanelIntoView();
  }

  function selectOwnerPhase(phase: IssuePhase | 'all') {
    setSelectedOwnerPhase(phase);
    setActiveModule('owners');
    scrollActivePanelIntoView();
  }

  function updateCategory(categoryId: string, label: string) {
    onChangeData?.({
      ...data,
      categories: data.categories.map((category) => (category.id === categoryId ? { ...category, label } : category)),
    });
  }

  function updateSubtopic(subtopicId: string, patch: { label?: string; hidden?: boolean }) {
    onChangeData?.({
      ...data,
      subtopics: data.subtopics.map((subtopic) => (subtopic.id === subtopicId ? { ...subtopic, ...patch } : subtopic)),
    });
  }

  function updateIssueGroup(issueGroupId: string | undefined, patch: Partial<Pick<IssueGroup, 'title' | 'groupLabel' | 'status'>>) {
    if (!issueGroupId) return;

    onChangeData?.({
      ...data,
      issueGroups: data.issueGroups.map((issue) =>
        issue.id === issueGroupId ? { ...issue, ...patch, statusSource: patch.status ? 'manual' : issue.statusSource } : issue,
      ),
    });
  }

  function updateRowPhase(detailIssueId: string, issueGroupId: string | undefined, phase: IssuePhase) {
    const status = DEFAULT_STATUS_BY_PHASE[phase];

    onChangeData?.({
      ...data,
      issueGroups: data.issueGroups.map((issue) =>
        issue.id === issueGroupId ? { ...issue, status, statusSource: 'manual' } : issue,
      ),
      detailIssues: data.detailIssues.map((detailIssue) =>
        detailIssue.id === detailIssueId ? { ...detailIssue, status } : detailIssue,
      ),
    });
  }

  function updateDetailIssue(
    detailIssueId: string,
    patch: Partial<Pick<DetailIssue, 'title' | 'status' | 'ownerName' | 'ownerResearchGroup' | 'relatedDepartment'>>,
  ) {
    const shouldSyncOwner =
      'ownerName' in patch || 'ownerResearchGroup' in patch || 'relatedDepartment' in patch;
    const nextDetailIssues = data.detailIssues.map((detailIssue) =>
      detailIssue.id === detailIssueId ? { ...detailIssue, ...patch } : detailIssue,
    );
    const nextDetailIssue = nextDetailIssues.find((item) => item.id === detailIssueId);

    onChangeData?.({
      ...data,
      issueGroups:
        shouldSyncOwner && nextDetailIssue
          ? data.issueGroups.map((issue) =>
              issue.id === nextDetailIssue.issueGroupId
                ? {
                    ...issue,
                    ownerName: nextDetailIssue.ownerName,
                    ownerResearchGroup: nextDetailIssue.ownerResearchGroup,
                    relatedDepartment: nextDetailIssue.relatedDepartment,
                  }
                : issue,
            )
          : data.issueGroups,
      detailIssues: nextDetailIssues,
    });
  }

  function updateStatusLabel(status: IssueStatus, label: string) {
    onChangeData?.({
      ...data,
      settings: {
        ...data.settings,
        statusLabels: {
          ...data.settings?.statusLabels,
          [status]: label.trim() || STATUS_LABELS[status],
        },
      },
    });
  }

  function updateRecordTypeLabel(recordType: IssueRecordType, label: string) {
    onChangeData?.({
      ...data,
      settings: {
        ...data.settings,
        recordTypeLabels: {
          ...data.settings?.recordTypeLabels,
          [recordType]: label.trim() || RECORD_TYPE_LABELS[recordType],
        },
      },
    });
  }

  function moveStatusOption(status: IssueStatus, direction: -1 | 1) {
    updateOrderedOption('statusOrder', orderedStatuses, status, direction);
  }

  function toggleStatusOption(status: IssueStatus, hidden: boolean) {
    updateHiddenOption('hiddenStatuses', orderedStatuses, data.settings?.hiddenStatuses ?? [], status, hidden);
  }

  function moveRecordTypeOption(recordType: IssueRecordType, direction: -1 | 1) {
    updateOrderedOption('recordTypeOrder', orderedRecordTypes, recordType, direction);
  }

  function toggleRecordTypeOption(recordType: IssueRecordType, hidden: boolean) {
    updateHiddenOption('hiddenRecordTypes', orderedRecordTypes, data.settings?.hiddenRecordTypes ?? [], recordType, hidden);
  }

  function updateOrderedOption<T extends IssueStatus | IssueRecordType>(
    key: 'statusOrder' | 'recordTypeOrder',
    values: T[],
    value: T,
    direction: -1 | 1,
  ) {
    const index = values.indexOf(value);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= values.length) return;
    const nextValues = [...values];
    const [moved] = nextValues.splice(index, 1);
    nextValues.splice(nextIndex, 0, moved);
    onChangeData?.({
      ...data,
      settings: {
        ...data.settings,
        [key]: nextValues,
      },
    });
  }

  function updateHiddenOption<T extends IssueStatus | IssueRecordType>(
    key: 'hiddenStatuses' | 'hiddenRecordTypes',
    allowedValues: T[],
    currentValues: T[],
    value: T,
    hidden: boolean,
  ) {
    const nextValues = hidden
      ? [...currentValues.filter((item) => item !== value), value]
      : currentValues.filter((item) => item !== value);
    onChangeData?.({
      ...data,
      settings: {
        ...data.settings,
        [key]: nextValues.filter((item) => allowedValues.includes(item)),
      },
    });
  }

  function addLabelOption() {
    const label = newLabelOption.trim();
    if (!label || labelOptions.includes(label)) return;
    onChangeData?.({
      ...data,
      settings: {
        ...data.settings,
        labelOptions: [...configuredLabelOptions, label],
      },
    });
    setNewLabelOption('');
  }

  function renameLabelOption(previousLabel: string, nextLabel: string) {
    const trimmed = nextLabel.trim();
    if (!trimmed) return;
    onChangeData?.({
      ...data,
      issueGroups: data.issueGroups.map((issue) => (issue.groupLabel === previousLabel ? { ...issue, groupLabel: trimmed } : issue)),
      settings: {
        ...data.settings,
        labelOptions: configuredLabelOptions.map((label) => (label === previousLabel ? trimmed : label)),
      },
    });
  }

  function removeLabelOption(labelToRemove: string) {
    onChangeData?.({
      ...data,
      settings: {
        ...data.settings,
        labelOptions: configuredLabelOptions.filter((label) => label !== labelToRemove),
      },
    });
  }

  function moveLabelOption(labelToMove: string, direction: -1 | 1) {
    const index = configuredLabelOptions.indexOf(labelToMove);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= configuredLabelOptions.length) return;

    const nextOptions = [...configuredLabelOptions];
    const [moved] = nextOptions.splice(index, 1);
    nextOptions.splice(nextIndex, 0, moved);
    onChangeData?.({
      ...data,
      settings: {
        ...data.settings,
        labelOptions: nextOptions,
      },
    });
  }

  return (
    <section className="admin-page" aria-label="관리자 페이지">
      <div className="admin-page__hero">
        <div>
          <p className="breadcrumb">관리자</p>
          <h2>운영 관리</h2>
        </div>
      </div>

      <div className="admin-stat-grid" aria-label="관리 지표">
        <button
          aria-label={`대분류 / 하위 주제 ${data.categories.length} / ${data.subtopics.filter((subtopic) => !subtopic.hidden).length}개 보기`}
          aria-pressed={activeModule === 'classification'}
          className={activeModule === 'classification' ? 'is-active' : ''}
          type="button"
          onClick={() => activateModule('classification')}
        >
          <Database size={18} />
          <span>대분류 / 하위 주제</span>
          <strong>{data.categories.length} / {data.subtopics.filter((subtopic) => !subtopic.hidden).length}</strong>
        </button>
        <button
          aria-label={`데이터 ${data.historyEntries.length}건 내보내기와 가져오기 보기`}
          aria-pressed={activeModule === 'data'}
          className={activeModule === 'data' ? 'is-active' : ''}
          type="button"
          onClick={() => activateModule('data')}
        >
          <FileArchive size={18} />
          <span>데이터</span>
          <strong>{data.historyEntries.length}건</strong>
        </button>
        <button
          aria-label={`이슈 / 세부 카드 ${data.issueGroups.filter((issue) => !issue.archived).length} / ${data.detailIssues.filter((detailIssue) => !detailIssue.archived).length}건 보기`}
          aria-pressed={activeModule === 'owners'}
          className={activeModule === 'owners' ? 'is-active' : ''}
          type="button"
          onClick={() => activateModule('owners')}
        >
          <FileText size={18} />
          <span>이슈 / 세부 카드</span>
          <strong>{data.issueGroups.filter((issue) => !issue.archived).length} / {data.detailIssues.filter((detailIssue) => !detailIssue.archived).length}</strong>
        </button>
        <button
          aria-label={`옵션 ${visibleOptionCount}개 표시명과 후보 관리 보기`}
          aria-pressed={activeModule === 'options'}
          className={activeModule === 'options' ? 'is-active' : ''}
          type="button"
          onClick={() => activateModule('options')}
        >
          <Settings2 size={18} />
          <span>옵션</span>
          <strong>{visibleOptionCount}개</strong>
        </button>
        <button
          aria-label={`이력 ${data.historyEntries.length}건 보고서 양식 보기`}
          aria-pressed={activeModule === 'report'}
          className={activeModule === 'report' ? 'is-active' : ''}
          type="button"
          onClick={() => activateModule('report')}
        >
          <UsersRound size={18} />
          <span>보고서</span>
          <strong>{data.historyEntries.length}</strong>
        </button>
        <button
          aria-label="권한 관리 사용자 추가와 역할 변경 보기"
          aria-pressed={activeModule === 'permissions'}
          className={activeModule === 'permissions' ? 'is-active' : ''}
          type="button"
          onClick={() => activateModule('permissions')}
        >
          <ShieldCheck size={18} />
          <span>권한 관리</span>
          <strong>역할</strong>
        </button>
      </div>

      <div className={`admin-layout admin-layout--${activeModule}`}>
        <div className="admin-layout__main" ref={mainPanelRef}>
          {activeModule === 'data' && (
            <AdminDataPanel data={data} onImportJson={onImportJson} onImportXlsx={onImportXlsx} onReset={onReset} />
          )}

          {activeModule === 'classification' && (
            <section className="admin-panel admin-panel--taxonomy" aria-label="분류 관리">
              <div>
                <h2>분류 관리</h2>
                <p>홈 화면과 이력 추가에서 사용하는 대분류와 하위 주제 이름을 바로 수정합니다.</p>
              </div>
              <div className="admin-taxonomy-list">
                {data.categories
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((category) => {
                    const subtopics = data.subtopics
                      .filter((subtopic) => subtopic.categoryId === category.id)
                      .sort((a, b) => a.order - b.order);

                    return (
                      <section className="admin-taxonomy-group" key={category.id}>
                        <label className="admin-inline-field">
                          <span>대분류명 {category.label}</span>
                          <input
                            data-testid={`admin-category-${category.id}`}
                            disabled={!canEditBoardData}
                            value={category.label}
                            onChange={(event) => updateCategory(category.id, event.target.value)}
                          />
                        </label>
                        <div className="admin-subtopic-list">
                          {subtopics.map((subtopic) => (
                            <div className="admin-subtopic-row" key={subtopic.id}>
                              <label className="admin-inline-field">
                                <span>하위 주제명 {subtopic.label}</span>
                                <input
                                  disabled={!canEditBoardData}
                                  data-testid={`admin-subtopic-${subtopic.id}`}
                                  value={subtopic.label}
                                  onChange={(event) => updateSubtopic(subtopic.id, { label: event.target.value })}
                                />
                              </label>
                              <label className="admin-small-toggle">
                                <input
                                  checked={Boolean(subtopic.hidden)}
                                  disabled={!canEditBoardData}
                                  type="checkbox"
                                  onChange={(event) => updateSubtopic(subtopic.id, { hidden: event.target.checked })}
                                />
                                <span>숨김</span>
                              </label>
                            </div>
                          ))}
                        </div>
                      </section>
                    );
                  })}
              </div>
            </section>
          )}

          {activeModule === 'permissions' && (
            <AdminUsersPanel apiBaseUrl={apiBaseUrl} authToken={authToken} />
          )}

          {activeModule === 'owners' && (
            <section className="admin-panel admin-panel--owner-table" aria-label="담당 정보 관리">
              <div>
                <h2>담당 정보 관리</h2>
                <p>이슈명, 업무 라벨, 세부 항목, 대표 단계, 담당 정보를 수정하면 홈, 상세, 보고서에 함께 반영됩니다.</p>
              </div>
              <div className="admin-owner-table">
                <div className="admin-owner-table__head">
                  <span>세부 카드</span>
                  <span>이슈명</span>
                  <span>업무 라벨</span>
                  <span>세부 항목</span>
                  <span>대표 단계</span>
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
                    <label className="admin-table-field">
                      <span>이슈명</span>
                      <input
                        aria-label={`${row.title} 이슈명`}
                        data-testid={`admin-issue-title-${row.issueId ?? row.id}`}
                        disabled={!canEditBoardData || !row.issueId}
                        value={row.issueTitle}
                        onChange={(event) => updateIssueGroup(row.issueId, { title: event.target.value })}
                      />
                    </label>
                    <label className="admin-table-field">
                      <span>업무 라벨</span>
                      <input
                        aria-label={`${row.title} 업무 라벨`}
                        data-testid={`admin-issue-label-${row.issueId ?? row.id}`}
                        disabled={!canEditBoardData || !row.issueId}
                        value={row.issueGroupLabel}
                        onChange={(event) => updateIssueGroup(row.issueId, { groupLabel: event.target.value })}
                      />
                    </label>
                    <label className="admin-table-field">
                      <span>세부 항목명</span>
                      <input
                        aria-label={`${row.title} 세부 항목명`}
                        data-testid={`admin-detail-title-${row.id}`}
                        disabled={!canEditBoardData}
                        value={row.title}
                        onChange={(event) => updateDetailIssue(row.id, { title: event.target.value })}
                      />
                    </label>
                    <label className="admin-table-field">
                      <span>대표 단계</span>
                      <select
                        aria-label={`${row.title} 대표 단계`}
                        data-testid={`admin-detail-phase-${row.id}`}
                        disabled={!canEditBoardData}
                        value={row.phase}
                        onChange={(event) => updateRowPhase(row.id, row.issueId, event.target.value as IssuePhase)}
                      >
                        {PHASE_ORDER.map((phase) => (
                          <option key={phase} value={phase}>
                            {PHASE_LABELS[phase]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="admin-table-field">
                      <span>{row.title} 담당자</span>
                      <input
                        data-testid={`admin-detail-owner-${row.id}`}
                        disabled={!canEditBoardData}
                        value={row.ownerName === '미정' ? '' : row.ownerName}
                        onChange={(event) =>
                          updateDetailIssue(row.id, {
                            ownerName: event.target.value || undefined,
                            ownerResearchGroup: row.ownerDepartment === '미정' ? undefined : row.ownerDepartment,
                            relatedDepartment: row.relatedDepartment === '미정' ? undefined : row.relatedDepartment,
                          })
                        }
                      />
                    </label>
                    <label className="admin-table-field">
                      <span>{row.title} 담당부서</span>
                      <input
                        data-testid={`admin-detail-owner-department-${row.id}`}
                        disabled={!canEditBoardData}
                        value={row.ownerDepartment === '미정' ? '' : row.ownerDepartment}
                        onChange={(event) =>
                          updateDetailIssue(row.id, {
                            ownerName: row.ownerName === '미정' ? undefined : row.ownerName,
                            ownerResearchGroup: event.target.value || undefined,
                            relatedDepartment: row.relatedDepartment === '미정' ? undefined : row.relatedDepartment,
                          })
                        }
                      />
                    </label>
                    <label className="admin-table-field">
                      <span>{row.title} 유관부서</span>
                      <input
                        data-testid={`admin-detail-related-department-${row.id}`}
                        disabled={!canEditBoardData}
                        value={row.relatedDepartment === '미정' ? '' : row.relatedDepartment}
                        onChange={(event) =>
                          updateDetailIssue(row.id, {
                            ownerName: row.ownerName === '미정' ? undefined : row.ownerName,
                            ownerResearchGroup: row.ownerDepartment === '미정' ? undefined : row.ownerDepartment,
                            relatedDepartment: event.target.value || undefined,
                          })
                        }
                      />
                    </label>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeModule === 'options' && (
            <section className="admin-panel admin-panel--options" aria-label="옵션 관리">
              <div>
                <h2>옵션 관리</h2>
                <p>이력 추가, 상세, 보고서, Excel 내보내기에 표시되는 세부 단계와 유형 이름, 업무 라벨 후보를 관리합니다. 세부 단계와 유형은 상태색과 데이터 호환성을 유지하기 위해 표시명, 순서, 숨김으로 운영합니다.</p>
              </div>

              <div className="admin-option-layout">
                <section className="admin-option-card">
                  <h3>세부 단계 표시명</h3>
                  <div className="admin-option-list">
                    {orderedStatuses.map((status, index) => (
                      <div className="admin-option-row" key={status}>
                        <label className="admin-table-field">
                          <span>{STATUS_LABELS[status]}</span>
                          <input
                            aria-label={`세부 단계 ${STATUS_LABELS[status]}`}
                            disabled={!canEditBoardData}
                            value={statusLabels[status]}
                            onChange={(event) => updateStatusLabel(status, event.target.value)}
                          />
                        </label>
                        <label className="admin-small-toggle">
                          <input
                            aria-label={`${STATUS_LABELS[status]} 표시`}
                            checked={!hiddenStatuses.has(status)}
                            disabled={!canEditBoardData}
                            type="checkbox"
                            onChange={(event) => toggleStatusOption(status, !event.target.checked)}
                          />
                          <span>표시</span>
                        </label>
                        <div className="admin-label-option-actions" aria-label={`${STATUS_LABELS[status]} 순서 관리`}>
                          <button
                            aria-label={`${STATUS_LABELS[status]} 위로 이동`}
                            className="icon-button ghost"
                            disabled={!canEditBoardData || index === 0}
                            type="button"
                            onClick={() => moveStatusOption(status, -1)}
                          >
                            <ArrowUp size={16} />
                          </button>
                          <button
                            aria-label={`${STATUS_LABELS[status]} 아래로 이동`}
                            className="icon-button ghost"
                            disabled={!canEditBoardData || index === orderedStatuses.length - 1}
                            type="button"
                            onClick={() => moveStatusOption(status, 1)}
                          >
                            <ArrowDown size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="admin-option-card">
                  <h3>유형 표시명</h3>
                  <div className="admin-option-list">
                    {orderedRecordTypes.map((recordType, index) => (
                      <div className="admin-option-row" key={recordType}>
                        <label className="admin-table-field">
                          <span>{RECORD_TYPE_LABELS[recordType]}</span>
                          <input
                            aria-label={`유형 ${RECORD_TYPE_LABELS[recordType]}`}
                            disabled={!canEditBoardData}
                            value={recordTypeLabels[recordType]}
                            onChange={(event) => updateRecordTypeLabel(recordType, event.target.value)}
                          />
                        </label>
                        <label className="admin-small-toggle">
                          <input
                            aria-label={`${RECORD_TYPE_LABELS[recordType]} 표시`}
                            checked={!hiddenRecordTypes.has(recordType)}
                            disabled={!canEditBoardData}
                            type="checkbox"
                            onChange={(event) => toggleRecordTypeOption(recordType, !event.target.checked)}
                          />
                          <span>표시</span>
                        </label>
                        <div className="admin-label-option-actions" aria-label={`${RECORD_TYPE_LABELS[recordType]} 순서 관리`}>
                          <button
                            aria-label={`${RECORD_TYPE_LABELS[recordType]} 위로 이동`}
                            className="icon-button ghost"
                            disabled={!canEditBoardData || index === 0}
                            type="button"
                            onClick={() => moveRecordTypeOption(recordType, -1)}
                          >
                            <ArrowUp size={16} />
                          </button>
                          <button
                            aria-label={`${RECORD_TYPE_LABELS[recordType]} 아래로 이동`}
                            className="icon-button ghost"
                            disabled={!canEditBoardData || index === orderedRecordTypes.length - 1}
                            type="button"
                            onClick={() => moveRecordTypeOption(recordType, 1)}
                          >
                            <ArrowDown size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="admin-option-card">
                  <h3>업무 라벨 후보</h3>
                  <div className="admin-label-option-create">
                    <label className="admin-inline-field">
                      <span>새 업무 라벨</span>
                      <input
                        disabled={!canEditBoardData}
                        value={newLabelOption}
                        onChange={(event) => setNewLabelOption(event.target.value)}
                      />
                    </label>
                    <button className="text-button" disabled={!canEditBoardData || !newLabelOption.trim()} type="button" onClick={addLabelOption}>
                      추가
                    </button>
                  </div>
                  <div className="admin-label-option-list">
                    {configuredLabelOptions.map((label, index) => (
                      <div className="admin-label-option-row" key={label}>
                        <label className="admin-table-field">
                          <span>업무 라벨 {label}</span>
                          <input
                            disabled={!canEditBoardData}
                            value={label}
                            onChange={(event) => renameLabelOption(label, event.target.value)}
                          />
                        </label>
                        <div className="admin-label-option-actions" aria-label={`${label} 순서 관리`}>
                          <button
                            aria-label={`${label} 위로 이동`}
                            className="icon-button ghost"
                            disabled={!canEditBoardData || index === 0}
                            type="button"
                            onClick={() => moveLabelOption(label, -1)}
                          >
                            <ArrowUp size={16} />
                          </button>
                          <button
                            aria-label={`${label} 아래로 이동`}
                            className="icon-button ghost"
                            disabled={!canEditBoardData || index === configuredLabelOptions.length - 1}
                            type="button"
                            onClick={() => moveLabelOption(label, 1)}
                          >
                            <ArrowDown size={16} />
                          </button>
                          <button
                            aria-label={`${label} 후보 삭제`}
                            className="icon-button ghost danger"
                            disabled={!canEditBoardData}
                            type="button"
                            onClick={() => removeLabelOption(label)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {configuredLabelOptions.length === 0 && (
                      <p className="admin-option-empty">등록된 후보가 없습니다.</p>
                    )}
                  </div>
                  {derivedIssueLabels.length > 0 && (
                    <div className="admin-derived-label-list" role="group" aria-label="사용 중인 업무 라벨">
                      <span>사용 중인 라벨</span>
                      <div>
                        {derivedIssueLabels.map((label) => (
                          <small className="admin-derived-label-chip" key={label}>{label}</small>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              </div>
            </section>
          )}

          {activeModule === 'permissions' && !apiBaseUrl && (
            <section className="admin-panel admin-panel--permission-note" aria-label="권한 관리">
              <div>
                <h2>권한 관리</h2>
                <p>권한 관리는 FastAPI 서버 모드에서 로그인한 관리자 계정으로 접속하면 사용자 추가, 권한 변경, 비밀번호 재설정을 사용할 수 있습니다.</p>
              </div>
            </section>
          )}

          {activeModule === 'report' && (
            <section className="admin-panel admin-panel--report-template" aria-label="보고서 양식">
              <div>
                <h2>보고서 양식</h2>
                <p>현재 분류, 담당 정보, 이력 내용을 기준으로 보고서 조건을 바로 열고 Word/Excel 파일을 생성합니다.</p>
              </div>
              <div className="admin-template-preview">
                <span>기본 파일명</span>
                <strong>선택범위_이력_보고서_YYYY-MM-DD</strong>
                <span>포함 항목</span>
                <strong>대분류, 하위 주제, 이슈, 세부 항목, 담당 정보, 날짜별 이력</strong>
              </div>
              <div className="admin-report-actions" aria-label="보고서 바로가기">
                <button className="primary-button" type="button" onClick={() => onOpenReport?.({})}>
                  <FileSpreadsheet size={16} />
                  전체 보고서 열기
                </button>
                <div className="admin-report-shortcut-list">
                  {reportShortcuts.map((row) => (
                    <button
                      key={row.subtopic.id}
                      type="button"
                      onClick={() => onOpenReport?.({ categoryId: row.subtopic.categoryId, subtopicId: row.subtopic.id })}
                    >
                      <span>
                        {row.category?.label ?? '대분류'} / {row.subtopic.label}
                      </span>
                      <strong>{row.historyCount}건</strong>
                      <small>최근 {row.latestDate ?? '-'}</small>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>

        <aside className="admin-layout__side" aria-label="운영 구성">
          <section className="admin-panel admin-panel--phase">
            <div>
              <h2>단계 현황</h2>
            </div>
            <div className="admin-phase-list">
              <button
                aria-pressed={selectedOwnerPhase === 'all'}
                className={selectedOwnerPhase === 'all' ? 'is-active' : ''}
                type="button"
                onClick={() => selectOwnerPhase('all')}
              >
                <span>전체 단계 보기</span>
                <strong>{data.issueGroups.filter((issue) => !issue.archived).length}건</strong>
              </button>
              {phaseCounts.map(({ phase, count }) => (
                <button
                  aria-pressed={selectedOwnerPhase === phase}
                  className={selectedOwnerPhase === phase ? 'is-active' : ''}
                  key={phase}
                  type="button"
                  onClick={() => selectOwnerPhase(phase)}
                >
                  <span className={`status-dot-label phase-${phase}`}>{PHASE_LABELS[phase]}</span>
                  <strong>{count}건</strong>
                </button>
              ))}
            </div>
          </section>

          <section className="admin-panel admin-panel--modules">
            <div>
              <h2>관리 메뉴</h2>
            </div>
            <div className="admin-module-list">
              {ADMIN_MODULES.map((module) => (
                <button
                  aria-pressed={activeModule === module.id}
                  className={activeModule === module.id ? 'is-active' : ''}
                  key={module.id}
                  type="button"
                  onClick={() => activateModule(module.id)}
                >
                  {module.label}
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
