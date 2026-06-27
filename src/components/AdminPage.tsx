import {
  ArrowDown,
  ArrowUp,
  Database,
  FileSpreadsheet,
  Plus,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { getIssueLabelOptions, getOrderedRecordTypes, getOrderedStatuses, getRecordTypeLabels, getStatusLabels, getStatusPhase } from '../domain/options';
import type { CustomIssueRecordType, CustomIssueStatus, IssueBoardData, IssuePhase, IssueRecordType, IssueStatus } from '../domain/types';
import { PHASE_LABELS, RECORD_TYPE_LABELS, STATUS_LABELS } from '../domain/types';
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

const ADMIN_MODULES = [
  { id: 'classification', label: '분류 관리', Icon: Database },
  { id: 'options', label: '옵션 관리', Icon: Settings2 },
  { id: 'permissions', label: '권한 관리', Icon: ShieldCheck },
  { id: 'report', label: '보고서 바로가기', Icon: FileSpreadsheet },
] as const;

type AdminModule = (typeof ADMIN_MODULES)[number]['id'];

const OPTION_MODULES = [
  { id: 'status', label: '세부 단계' },
  { id: 'recordType', label: '유형' },
  { id: 'label', label: '업무 라벨' },
] as const;

type OptionModule = (typeof OPTION_MODULES)[number]['id'];

const PHASE_ORDER: IssuePhase[] = ['received', 'in_progress', 'closed'];

export function AdminPage({
  data,
  onChangeData,
  onOpenReport,
  apiBaseUrl,
  authToken,
}: AdminPageProps) {
  const [activeModule, setActiveModule] = useState<AdminModule>('classification');
  const [activeOptionModule, setActiveOptionModule] = useState<OptionModule>('status');
  const [activeCategoryId, setActiveCategoryId] = useState(data.categories.slice().sort((a, b) => a.order - b.order)[0]?.id ?? '');
  const [newCategoryLabel, setNewCategoryLabel] = useState('');
  const [newSubtopicLabels, setNewSubtopicLabels] = useState<Record<string, string>>({});
  const [newStatusLabel, setNewStatusLabel] = useState('');
  const [newStatusPhase, setNewStatusPhase] = useState<IssuePhase>('in_progress');
  const [newRecordTypeLabel, setNewRecordTypeLabel] = useState('');
  const [newLabelOption, setNewLabelOption] = useState('');
  const mainPanelRef = useRef<HTMLDivElement>(null);
  const canEditBoardData = Boolean(onChangeData);
  const statusLabels = getStatusLabels(data);
  const recordTypeLabels = getRecordTypeLabels(data);
  const orderedStatuses = getOrderedStatuses(data);
  const orderedRecordTypes = getOrderedRecordTypes(data);
  const sortedCategories = data.categories.slice().sort((a, b) => a.order - b.order);
  const selectedCategory = sortedCategories.find((category) => category.id === activeCategoryId) ?? sortedCategories[0];
  const selectedSubtopics = selectedCategory
    ? data.subtopics.filter((subtopic) => subtopic.categoryId === selectedCategory.id).sort((a, b) => a.order - b.order)
    : [];
  const statusGroups = PHASE_ORDER.map((phase) => ({
    phase,
    statuses: orderedStatuses.filter((status) => getStatusPhase(data, status) === phase),
  })).filter((group) => group.statuses.length > 0);
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
  const moduleStats: Record<AdminModule, string> = {
    classification: `${data.categories.length} / ${data.subtopics.filter((subtopic) => !subtopic.hidden).length}`,
    options: `${visibleOptionCount}개`,
    permissions: '역할',
    report: `${data.historyEntries.length}건`,
  };
  const moduleAriaLabels: Record<AdminModule, string> = {
    classification: `분류 관리: 대분류 ${data.categories.length}개, 하위 주제 ${data.subtopics.filter((subtopic) => !subtopic.hidden).length}개`,
    options: `옵션 관리: ${visibleOptionCount}개`,
    permissions: '권한 관리: 사용자 역할',
    report: `보고서 바로가기: 이력 ${data.historyEntries.length}건`,
  };
  const optionModuleStats: Record<OptionModule, string> = {
    status: `${orderedStatuses.length}개`,
    recordType: `${orderedRecordTypes.length}개`,
    label: `${labelOptions.length}개`,
  };

  function scrollActivePanelIntoView() {
    if (typeof window === 'undefined' || !window.matchMedia?.('(max-width: 1180px)').matches) return;
    window.requestAnimationFrame(() => mainPanelRef.current?.scrollIntoView({ block: 'start' }));
  }

  function activateModule(module: AdminModule) {
    setActiveModule(module);
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

  function addCategory() {
    const label = newCategoryLabel.trim();
    if (!label) return;
    const id = createUniqueId('category', label, data.categories.map((category) => category.id));
    onChangeData?.({
      ...data,
      categories: [
        ...data.categories,
        {
          id,
          label,
          description: '',
          order: Math.max(0, ...data.categories.map((category) => category.order)) + 1,
        },
      ],
    });
    setActiveCategoryId(id);
    setNewCategoryLabel('');
  }

  function addSubtopic(categoryId: string) {
    const label = newSubtopicLabels[categoryId]?.trim();
    if (!label) return;
    const categorySubtopics = data.subtopics.filter((subtopic) => subtopic.categoryId === categoryId);
    const id = createUniqueId('subtopic', label, data.subtopics.map((subtopic) => subtopic.id));
    onChangeData?.({
      ...data,
      subtopics: [
        ...data.subtopics,
        {
          id,
          categoryId,
          label,
          order: Math.max(0, ...categorySubtopics.map((subtopic) => subtopic.order)) + 1,
          hidden: false,
        },
      ],
    });
    setNewSubtopicLabels((current) => ({ ...current, [categoryId]: '' }));
  }

  function updateStatusLabel(status: IssueStatus, label: string) {
    onChangeData?.({
      ...data,
      settings: {
        ...data.settings,
        statusLabels: {
          ...data.settings?.statusLabels,
          [status]: label.trim() || statusLabels[status],
        },
      },
    });
  }

  function updateCustomStatusPhase(status: IssueStatus, phase: IssuePhase) {
    const customStatuses = data.settings?.customStatuses ?? [];
    if (!customStatuses.some((customStatus) => customStatus.id === status)) return;
    onChangeData?.({
      ...data,
      settings: {
        ...data.settings,
        customStatuses: customStatuses.map((customStatus) =>
          customStatus.id === status ? { ...customStatus, phase } : customStatus,
        ),
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
          [recordType]: label.trim() || recordTypeLabels[recordType],
        },
      },
    });
  }

  function moveStatusOptionWithinPhase(statusesInPhase: IssueStatus[], status: IssueStatus, direction: -1 | 1) {
    const index = statusesInPhase.indexOf(status);
    const nextStatus = statusesInPhase[index + direction];
    if (!nextStatus) return;
    const nextValues = [...orderedStatuses];
    const currentIndex = nextValues.indexOf(status);
    const nextIndex = nextValues.indexOf(nextStatus);
    if (currentIndex < 0 || nextIndex < 0) return;
    nextValues[currentIndex] = nextStatus;
    nextValues[nextIndex] = status;
    onChangeData?.({
      ...data,
      settings: {
        ...data.settings,
        statusOrder: nextValues,
      },
    });
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

  function addStatusOption() {
    const label = newStatusLabel.trim();
    if (!label || Object.values(statusLabels).includes(label)) return;
    const id = createUniqueId('custom-status', label, orderedStatuses) as CustomIssueStatus;
    onChangeData?.({
      ...data,
      settings: {
        ...data.settings,
        customStatuses: [...(data.settings?.customStatuses ?? []), { id, label, phase: newStatusPhase }],
        statusOrder: [...orderedStatuses, id],
        hiddenStatuses: (data.settings?.hiddenStatuses ?? []).filter((status) => status !== id),
      },
    });
    setNewStatusLabel('');
  }

  function addRecordTypeOption() {
    const label = newRecordTypeLabel.trim();
    if (!label || Object.values(recordTypeLabels).includes(label)) return;
    const id = createUniqueId('custom-record', label, orderedRecordTypes) as CustomIssueRecordType;
    onChangeData?.({
      ...data,
      settings: {
        ...data.settings,
        customRecordTypes: [...(data.settings?.customRecordTypes ?? []), { id, label }],
        recordTypeOrder: [...orderedRecordTypes, id],
        hiddenRecordTypes: (data.settings?.hiddenRecordTypes ?? []).filter((recordType) => recordType !== id),
      },
    });
    setNewRecordTypeLabel('');
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

  function updateReportHtmlTemplate(template: string, fileName: string) {
    onChangeData?.({
      ...data,
      settings: {
        ...data.settings,
        reportHtmlTemplate: template,
        reportHtmlTemplateName: fileName,
      },
    });
  }

  function resetReportHtmlTemplate() {
    onChangeData?.({
      ...data,
      settings: {
        ...data.settings,
        reportHtmlTemplate: undefined,
        reportHtmlTemplateName: undefined,
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

      <nav className="admin-module-tabs" aria-label="관리 메뉴">
        {ADMIN_MODULES.map(({ id, label, Icon }) => (
          <button
            aria-label={moduleAriaLabels[id]}
            aria-pressed={activeModule === id}
            className={activeModule === id ? 'is-active' : ''}
            key={id}
            type="button"
            onClick={() => activateModule(id)}
          >
            <Icon size={16} />
            <span>{label}</span>
            <strong>{moduleStats[id]}</strong>
          </button>
        ))}
      </nav>

      <div className={`admin-layout admin-layout--${activeModule}`}>
        <div className="admin-layout__main" ref={mainPanelRef}>
          {activeModule === 'classification' && (
            <section className="admin-panel admin-panel--taxonomy" aria-label="분류 관리">
              <div>
                <h2>분류 관리</h2>
                <p>홈 화면과 이력 추가에서 사용하는 대분류와 하위 주제를 수정하거나 추가합니다.</p>
              </div>
              <div className="admin-create-row">
                <label className="admin-inline-field">
                  <span>새 대분류</span>
                  <input
                    aria-label="새 대분류"
                    disabled={!canEditBoardData}
                    value={newCategoryLabel}
                    onChange={(event) => setNewCategoryLabel(event.target.value)}
                  />
                </label>
                <button className="text-button" disabled={!canEditBoardData || !newCategoryLabel.trim()} type="button" onClick={addCategory}>
                  <Plus size={15} />
                  대분류 추가
                </button>
              </div>

              {selectedCategory && (
                <div className="admin-taxonomy-shell">
                  <div className="admin-taxonomy-tabs" role="tablist" aria-label="대분류 선택">
                    {sortedCategories.map((category) => {
                      const visibleSubtopicCount = data.subtopics.filter((subtopic) => subtopic.categoryId === category.id && !subtopic.hidden).length;
                      return (
                        <button
                          aria-selected={selectedCategory.id === category.id}
                          className={selectedCategory.id === category.id ? 'is-active' : ''}
                          key={category.id}
                          role="tab"
                          type="button"
                          onClick={() => setActiveCategoryId(category.id)}
                        >
                          <span>{category.label}</span>
                          <strong>{visibleSubtopicCount}개</strong>
                        </button>
                      );
                    })}
                  </div>

                  <section className="admin-taxonomy-workspace" aria-label={`${selectedCategory.label} 분류 관리`} role="tabpanel">
                    <div className="admin-taxonomy-editor">
                      <label className="admin-inline-field">
                        <span>대분류명</span>
                        <input
                          aria-label={`대분류명 ${selectedCategory.label}`}
                          data-testid={`admin-category-${selectedCategory.id}`}
                          disabled={!canEditBoardData}
                          value={selectedCategory.label}
                          onChange={(event) => updateCategory(selectedCategory.id, event.target.value)}
                        />
                      </label>
                      <div className="admin-create-row admin-create-row--nested">
                        <label className="admin-inline-field">
                          <span>{selectedCategory.label} 하위 주제 추가</span>
                          <input
                            aria-label={`${selectedCategory.label} 하위 주제 추가`}
                            disabled={!canEditBoardData}
                            value={newSubtopicLabels[selectedCategory.id] ?? ''}
                            onChange={(event) =>
                              setNewSubtopicLabels((current) => ({ ...current, [selectedCategory.id]: event.target.value }))
                            }
                          />
                        </label>
                        <button
                          className="text-button"
                          disabled={!canEditBoardData || !newSubtopicLabels[selectedCategory.id]?.trim()}
                          type="button"
                          onClick={() => addSubtopic(selectedCategory.id)}
                        >
                          <Plus size={15} />
                          하위 주제 추가
                        </button>
                      </div>
                    </div>

                    <div className="admin-taxonomy-subtopics" role="list">
                      {selectedSubtopics.map((subtopic) => {
                        const isVisible = !subtopic.hidden;
                        return (
                          <div className="admin-subtopic-row" key={subtopic.id} role="listitem">
                            <label className="admin-table-field admin-option-name-field">
                              <span>하위 주제명</span>
                              <input
                                aria-label={`하위 주제명 ${subtopic.label}`}
                                disabled={!canEditBoardData}
                                data-testid={`admin-subtopic-${subtopic.id}`}
                                value={subtopic.label}
                                onChange={(event) => updateSubtopic(subtopic.id, { label: event.target.value })}
                              />
                            </label>
                            <button
                              aria-checked={isVisible}
                              aria-label={`${subtopic.label} 보임 상태`}
                              className={isVisible ? 'admin-visibility-switch is-on' : 'admin-visibility-switch'}
                              disabled={!canEditBoardData}
                              role="switch"
                              type="button"
                              onClick={() => updateSubtopic(subtopic.id, { hidden: isVisible })}
                            >
                              <span aria-hidden="true" />
                              <strong>{isVisible ? '보임' : '숨김'}</strong>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </div>
              )}
            </section>
          )}

          {activeModule === 'permissions' && (
            <AdminUsersPanel apiBaseUrl={apiBaseUrl} authToken={authToken} />
          )}

          {activeModule === 'options' && (
            <section className="admin-panel admin-panel--options" aria-label="옵션 관리">
              <div>
                <h2>옵션 관리</h2>
                <p>이력 추가, 상세, 보고서, Excel 내보내기에 표시되는 세부 단계, 유형, 업무 라벨 후보를 관리합니다.</p>
              </div>

              <div className="admin-option-shell">
                <div className="admin-option-tabs" role="tablist" aria-label="옵션 하위 메뉴">
                  {OPTION_MODULES.map((optionModule) => (
                    <button
                      aria-selected={activeOptionModule === optionModule.id}
                      className={activeOptionModule === optionModule.id ? 'is-active' : ''}
                      key={optionModule.id}
                      role="tab"
                      type="button"
                      onClick={() => setActiveOptionModule(optionModule.id)}
                    >
                      <span>{optionModule.label}</span>
                      <strong>{optionModuleStats[optionModule.id]}</strong>
                    </button>
                  ))}
                </div>

                <div className="admin-option-workspace">
                  {activeOptionModule === 'status' && (
                    <section className="admin-option-pane" aria-label="세부 단계 관리" role="tabpanel">
                      <div className="admin-option-composer">
                        <label className="admin-inline-field">
                          <span>새 세부 단계</span>
                          <input
                            aria-label="새 세부 단계"
                            disabled={!canEditBoardData}
                            value={newStatusLabel}
                            onChange={(event) => setNewStatusLabel(event.target.value)}
                          />
                        </label>
                        <label className="admin-inline-field">
                          <span>대표 단계</span>
                          <select
                            aria-label="새 세부 단계 대표 단계"
                            disabled={!canEditBoardData}
                            value={newStatusPhase}
                            onChange={(event) => setNewStatusPhase(event.target.value as IssuePhase)}
                          >
                            {Object.entries(PHASE_LABELS).map(([phase, label]) => (
                              <option key={phase} value={phase}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          className="text-button"
                          disabled={!canEditBoardData || !newStatusLabel.trim()}
                          type="button"
                          onClick={addStatusOption}
                        >
                          <Plus size={15} />
                          세부 단계 추가
                        </button>
                      </div>

                      <div className="admin-option-list-frame admin-option-list-frame--grouped" role="list">
                        {statusGroups.map(({ phase, statuses }) => (
                          <section className="admin-option-phase-section" key={phase} aria-label={`${PHASE_LABELS[phase]} 세부 단계`}>
                            <header>
                              <strong data-phase={phase}>{PHASE_LABELS[phase]}</strong>
                              <span>{statuses.length}개</span>
                            </header>
                            {statuses.map((status, index) => {
                              const fallbackLabel = STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? statusLabels[status];
                              const isCustomStatus = (data.settings?.customStatuses ?? []).some((customStatus) => customStatus.id === status);
                              const statusPhase = getStatusPhase(data, status);
                              const isVisible = !hiddenStatuses.has(status);
                              return (
                                <div className="admin-option-list-row admin-option-list-row--status" key={status} role="listitem">
                                  <label className="admin-table-field admin-option-name-field">
                                    <span>세부 단계명</span>
                                    <input
                                      aria-label={`세부 단계 ${fallbackLabel}`}
                                      disabled={!canEditBoardData}
                                      value={statusLabels[status]}
                                      onChange={(event) => updateStatusLabel(status, event.target.value)}
                                    />
                                  </label>
                                  {isCustomStatus ? (
                                    <label className="admin-table-field admin-option-phase-field">
                                      <span>대표 단계</span>
                                      <select
                                        aria-label={`${fallbackLabel} 대표 단계`}
                                        disabled={!canEditBoardData}
                                        value={statusPhase}
                                        onChange={(event) => updateCustomStatusPhase(status, event.target.value as IssuePhase)}
                                      >
                                        {Object.entries(PHASE_LABELS).map(([phaseOption, label]) => (
                                          <option key={phaseOption} value={phaseOption}>
                                            {label}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                  ) : (
                                    <div className="admin-option-phase-readonly" aria-label={`${fallbackLabel} 대표 단계`}>
                                      <span>대표 단계</span>
                                      <strong data-phase={statusPhase}>{PHASE_LABELS[statusPhase]}</strong>
                                    </div>
                                  )}
                                  <button
                                    aria-checked={isVisible}
                                    aria-label={`${fallbackLabel} 보임 상태`}
                                    className={isVisible ? 'admin-visibility-switch is-on' : 'admin-visibility-switch'}
                                    disabled={!canEditBoardData}
                                    role="switch"
                                    type="button"
                                    onClick={() => toggleStatusOption(status, isVisible)}
                                  >
                                    <span aria-hidden="true" />
                                    <strong>{isVisible ? '보임' : '숨김'}</strong>
                                  </button>
                                  <div className="admin-label-option-actions" aria-label={`${fallbackLabel} 순서 관리`}>
                                    <button
                                      aria-label={`${fallbackLabel} 위로 이동`}
                                      className="icon-button ghost"
                                      disabled={!canEditBoardData || index === 0}
                                      type="button"
                                      onClick={() => moveStatusOptionWithinPhase(statuses, status, -1)}
                                    >
                                      <ArrowUp size={16} />
                                    </button>
                                    <button
                                      aria-label={`${fallbackLabel} 아래로 이동`}
                                      className="icon-button ghost"
                                      disabled={!canEditBoardData || index === statuses.length - 1}
                                      type="button"
                                      onClick={() => moveStatusOptionWithinPhase(statuses, status, 1)}
                                    >
                                      <ArrowDown size={16} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </section>
                        ))}
                      </div>
                    </section>
                  )}

                  {activeOptionModule === 'recordType' && (
                    <section className="admin-option-pane" aria-label="유형 관리" role="tabpanel">
                      <div className="admin-option-composer admin-option-composer--single">
                        <label className="admin-inline-field">
                          <span>새 유형</span>
                          <input
                            aria-label="새 유형"
                            disabled={!canEditBoardData}
                            value={newRecordTypeLabel}
                            onChange={(event) => setNewRecordTypeLabel(event.target.value)}
                          />
                        </label>
                        <button
                          className="text-button"
                          disabled={!canEditBoardData || !newRecordTypeLabel.trim()}
                          type="button"
                          onClick={addRecordTypeOption}
                        >
                          <Plus size={15} />
                          유형 추가
                        </button>
                      </div>

                      <div className="admin-option-list-frame" role="list">
                        {orderedRecordTypes.map((recordType, index) => {
                          const fallbackLabel = RECORD_TYPE_LABELS[recordType as keyof typeof RECORD_TYPE_LABELS] ?? recordTypeLabels[recordType];
                          const isVisible = !hiddenRecordTypes.has(recordType);
                          return (
                            <div className="admin-option-list-row" key={recordType} role="listitem">
                              <label className="admin-table-field admin-option-name-field">
                                <span>유형명</span>
                                <input
                                  aria-label={`유형 ${fallbackLabel}`}
                                  disabled={!canEditBoardData}
                                  value={recordTypeLabels[recordType]}
                                  onChange={(event) => updateRecordTypeLabel(recordType, event.target.value)}
                                />
                              </label>
                              <button
                                aria-checked={isVisible}
                                aria-label={`${fallbackLabel} 보임 상태`}
                                className={isVisible ? 'admin-visibility-switch is-on' : 'admin-visibility-switch'}
                                disabled={!canEditBoardData}
                                role="switch"
                                type="button"
                                onClick={() => toggleRecordTypeOption(recordType, isVisible)}
                              >
                                <span aria-hidden="true" />
                                <strong>{isVisible ? '보임' : '숨김'}</strong>
                              </button>
                              <div className="admin-label-option-actions" aria-label={`${fallbackLabel} 순서 관리`}>
                                <button
                                  aria-label={`${fallbackLabel} 위로 이동`}
                                  className="icon-button ghost"
                                  disabled={!canEditBoardData || index === 0}
                                  type="button"
                                  onClick={() => moveRecordTypeOption(recordType, -1)}
                                >
                                  <ArrowUp size={16} />
                                </button>
                                <button
                                  aria-label={`${fallbackLabel} 아래로 이동`}
                                  className="icon-button ghost"
                                  disabled={!canEditBoardData || index === orderedRecordTypes.length - 1}
                                  type="button"
                                  onClick={() => moveRecordTypeOption(recordType, 1)}
                                >
                                  <ArrowDown size={16} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {activeOptionModule === 'label' && (
                    <section className="admin-option-pane" aria-label="업무 라벨 관리" role="tabpanel">
                      <div className="admin-option-composer admin-option-composer--single">
                        <label className="admin-inline-field">
                          <span>새 업무 라벨</span>
                          <input
                            aria-label="새 업무 라벨"
                            disabled={!canEditBoardData}
                            value={newLabelOption}
                            onChange={(event) => setNewLabelOption(event.target.value)}
                          />
                        </label>
                        <button
                          className="text-button"
                          disabled={!canEditBoardData || !newLabelOption.trim()}
                          type="button"
                          onClick={addLabelOption}
                        >
                          <Plus size={15} />
                          라벨 추가
                        </button>
                      </div>

                      <div className="admin-option-list-frame" role="list">
                        {configuredLabelOptions.map((label, index) => (
                          <div className="admin-option-list-row" key={label} role="listitem">
                            <label className="admin-table-field admin-option-name-field">
                              <span>업무 라벨명</span>
                              <input
                                aria-label={`업무 라벨 ${label}`}
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
                  )}
                </div>
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
            <section className="admin-panel admin-panel--report-template" aria-label="보고서 바로가기">
              <div>
                <h2>보고서 바로가기</h2>
                <p>별도 양식 편집 화면이 아니라, 자주 쓰는 조건으로 보고서 탭을 바로 열어 HTML/Word/Excel 다운로드를 시작하는 영역입니다.</p>
              </div>
              <div className="admin-template-preview">
                <span>다운로드 파일명</span>
                <strong>선택범위_이력_보고서_YYYY-MM-DD</strong>
                <span>포함 항목</span>
                <strong>대분류, 하위 주제, 이슈, 세부 항목, 날짜별 이력, 첨부 URL, 브라우저용 HTML</strong>
              </div>
              <div className="admin-report-template-upload">
                <div>
                  <span>HTML 템플릿</span>
                  <strong>{data.settings?.reportHtmlTemplateName ?? '기본 템플릿'}</strong>
                </div>
                <div className="admin-report-template-actions">
                  <label className={`file-button ${!canEditBoardData ? 'is-disabled' : ''}`}>
                    <Upload size={15} />
                    템플릿 업로드
                    <input
                      accept=".html,text/html"
                      disabled={!canEditBoardData}
                      type="file"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        updateReportHtmlTemplate(await file.text(), file.name);
                        event.target.value = '';
                      }}
                    />
                  </label>
                  <button
                    className="text-button"
                    disabled={!canEditBoardData || !data.settings?.reportHtmlTemplate}
                    type="button"
                    onClick={resetReportHtmlTemplate}
                  >
                    <RotateCcw size={15} />
                    기본 템플릿
                  </button>
                </div>
                <div className="admin-report-template-tokens" aria-label="HTML 템플릿 토큰">
                  {[
                    'reportTitle',
                    'generatedAt',
                    'summaryCards',
                    'issueCards',
                    'historyRows',
                    'filterText',
                  ].map((token) => (
                    <code key={token}>{`{{${token}}}`}</code>
                  ))}
                </div>
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
      </div>
    </section>
  );
}

function createUniqueId(prefix: string, label: string, existingIds: string[]) {
  const existing = new Set(existingIds);
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item';
  let candidate = `${prefix}-${slug}`;
  let index = 2;
  while (existing.has(candidate)) {
    candidate = `${prefix}-${slug}-${index}`;
    index += 1;
  }
  return candidate;
}
