import { X } from 'lucide-react';
import { type KeyboardEvent, useMemo, useState } from 'react';
import { getDetailIssuesForGroup, getRecommendedIssueGroups } from '../domain/selectors';
import type { Category, DetailIssue, HistoryEntry, IssueBoardData, IssueGroup, IssuePhase, IssueRecordType, IssueStatus, Subtopic } from '../domain/types';
import { DEFAULT_STATUS_BY_PHASE, PHASE_LABELS, PHASE_STATUS_OPTIONS, RECORD_TYPE_LABELS, STATUS_LABELS, STATUS_PHASES } from '../domain/types';

const CATEGORY_ICON_OPTIONS = ['📌', '🧵', '📁', '🧪', '🤝', '🏭', '🔬', '⚙️', '🛠️', '📊', '🔒', '💡', '🧭', '🧾'];

type AddHistoryPanelProps = {
  data: IssueBoardData;
  categoryId: string;
  subtopicId: string;
  initialIssueGroupId?: string;
  initialDetailIssueId?: string;
  editingEntry?: HistoryEntry;
  onAddEntry: (
    issueGroup: IssueGroup,
    detailIssue: DetailIssue,
    entry: HistoryEntry,
    options: {
      isNewIssueGroup: boolean;
      isNewDetailIssue: boolean;
      category?: Category;
      subtopic?: Subtopic;
    },
  ) => void;
  onUpdateEntry?: (entry: HistoryEntry, detailIssue?: DetailIssue) => void;
  onClose: () => void;
};

export function AddHistoryPanel({
  data,
  categoryId,
  subtopicId,
  initialIssueGroupId,
  initialDetailIssueId,
  editingEntry,
  onAddEntry,
  onUpdateEntry,
  onClose,
}: AddHistoryPanelProps) {
  const isEditing = Boolean(editingEntry);
  const initialIssueGroup = data.issueGroups.find(
    (issue) => issue.id === (editingEntry?.issueGroupId ?? initialIssueGroupId),
  );
  const initialDetailIssue = data.detailIssues.find(
    (detailIssue) => detailIssue.id === (editingEntry?.detailIssueId ?? initialDetailIssueId),
  );
  const initialCategoryId = initialIssueGroup?.categoryId ?? categoryId ?? data.categories[0]?.id ?? '';
  const initialSubtopicId =
    initialIssueGroup?.subtopicId ??
    subtopicId ??
    data.subtopics.find((item) => item.categoryId === initialCategoryId && !item.hidden)?.id ??
    '';
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialCategoryId);
  const [selectedSubtopicId, setSelectedSubtopicId] = useState(initialSubtopicId);
  const [query, setQuery] = useState('');
  const [useNewCategory, setUseNewCategory] = useState(false);
  const [newCategoryLabel, setNewCategoryLabel] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState(CATEGORY_ICON_OPTIONS[0]);
  const [customCategoryIconInput, setCustomCategoryIconInput] = useState('');
  const [useNewSubtopic, setUseNewSubtopic] = useState(false);
  const [newSubtopicLabel, setNewSubtopicLabel] = useState('');
  const [useNewIssueGroup, setUseNewIssueGroup] = useState(false);
  const [newIssueTitle, setNewIssueTitle] = useState('');
  const [newIssueLabel, setNewIssueLabel] = useState('');
  const [newDetailTitle, setNewDetailTitle] = useState('');
  const categories = useMemo(
    () => data.categories.slice().sort((a, b) => a.order - b.order),
    [data.categories],
  );
  const subtopicsForCategory = useMemo(
    () =>
      data.subtopics
        .filter((item) => item.categoryId === selectedCategoryId && !item.hidden)
        .sort((a, b) => a.order - b.order),
    [data.subtopics, selectedCategoryId],
  );
  const issueGroups = useMemo(
    () =>
      getRecommendedIssueGroups(data, {
        categoryId: selectedCategoryId,
        subtopicId: selectedSubtopicId,
        query,
      }),
    [data, query, selectedCategoryId, selectedSubtopicId],
  );
  const [selectedIssueGroupId, setSelectedIssueGroupId] = useState<string>(
    editingEntry?.issueGroupId ?? initialIssueGroupId ?? '',
  );
  const selectedCategory = categories.find((category) => category.id === selectedCategoryId);
  const selectedSubtopic = subtopicsForCategory.find((subtopic) => subtopic.id === selectedSubtopicId);
  const selectedIssueGroup = data.issueGroups.find((issue) => issue.id === selectedIssueGroupId);
  const recommendedDetailIssues = useMemo(() => {
    if (!selectedIssueGroup || useNewIssueGroup) return [];
    const candidates = getDetailIssuesForGroup(data, selectedIssueGroup.id);
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return candidates;
    const groupSearchableText = [
      selectedIssueGroup.title,
      selectedIssueGroup.currentSummary,
      selectedIssueGroup.groupLabel,
      selectedIssueGroup.ownerName,
      selectedIssueGroup.ownerResearchGroup,
      selectedIssueGroup.relatedDepartment,
      ...selectedIssueGroup.tags,
    ]
      .join(' ')
      .toLowerCase();
    if (groupSearchableText.includes(normalizedQuery)) return candidates;
    return candidates.filter((detailIssue) =>
      [
        detailIssue.title,
        detailIssue.currentSummary,
        detailIssue.ownerName,
        detailIssue.ownerResearchGroup,
        detailIssue.relatedDepartment,
        ...detailIssue.tags,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [data, query, selectedIssueGroup, useNewIssueGroup]);
  const [selectedDetailIssueId, setSelectedDetailIssueId] = useState<string>(
    editingEntry?.detailIssueId ?? initialDetailIssueId ?? '',
  );
  const [useNewDetailIssue, setUseNewDetailIssue] = useState(false);
  const selectedDetailIssue =
    !useNewDetailIssue && selectedDetailIssueId ? data.detailIssues.find((detailIssue) => detailIssue.id === selectedDetailIssueId) : undefined;
  const [date, setDate] = useState(() => editingEntry?.date ?? new Date().toISOString().slice(0, 10));
  const initialStatus = editingEntry?.status ?? 'actioning';
  const [phase, setPhase] = useState<IssuePhase>(STATUS_PHASES[initialStatus]);
  const [status, setStatus] = useState<IssueStatus>(initialStatus);
  const [recordType, setRecordType] = useState<IssueRecordType>(editingEntry?.recordType ?? 'action');
  const [changesStatus, setChangesStatus] = useState(editingEntry?.changesDetailIssueStatus ?? false);
  const [summary, setSummary] = useState(editingEntry?.summary ?? '');
  const [details, setDetails] = useState(editingEntry?.details ?? '');
  const [remainingRisk, setRemainingRisk] = useState(editingEntry?.remainingRisk ?? '');
  const [referenceUrlText, setReferenceUrlText] = useState(editingEntry?.referenceLinks.join('\n') ?? '');
  const [ownerName, setOwnerName] = useState(initialDetailIssue?.ownerName ?? initialIssueGroup?.ownerName ?? '');
  const [ownerDepartment, setOwnerDepartment] = useState(
    initialDetailIssue?.ownerResearchGroup ?? initialIssueGroup?.ownerResearchGroup ?? '',
  );
  const [relatedDepartment, setRelatedDepartment] = useState(
    initialDetailIssue?.relatedDepartment ?? initialIssueGroup?.relatedDepartment ?? '',
  );
  const phaseOptions = Object.entries(PHASE_LABELS) as [IssuePhase, string][];
  const statusOptions = PHASE_STATUS_OPTIONS[phase].map((value) => [value, STATUS_LABELS[value]] as [IssueStatus, string]);
  const recordTypeOptions = Object.entries(RECORD_TYPE_LABELS) as [IssueRecordType, string][];

  function selectPhase(nextPhase: IssuePhase) {
    setPhase(nextPhase);
    if (!PHASE_STATUS_OPTIONS[nextPhase].includes(status)) {
      setStatus(DEFAULT_STATUS_BY_PHASE[nextPhase]);
    }
  }

  function insertListSeparator(
    event: KeyboardEvent<HTMLTextAreaElement>,
    value: string,
    setValue: (nextValue: string) => void,
  ) {
    if (event.key !== 'Enter' || event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return;
    event.preventDefault();

    const target = event.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const separator = value.trim().length === 0 && start === 0 ? '- ' : '\n- ';
    const nextValue = `${value.slice(0, start)}${separator}${value.slice(end)}`;
    const nextCursor = start + separator.length;

    setValue(nextValue);
    window.requestAnimationFrame(() => {
      target.setSelectionRange(nextCursor, nextCursor);
    });
  }

  function selectCategory(nextCategory: Category) {
    const nextSubtopic = data.subtopics
      .filter((item) => item.categoryId === nextCategory.id && !item.hidden)
      .sort((a, b) => a.order - b.order)[0];
    setSelectedCategoryId(nextCategory.id);
    setSelectedSubtopicId(nextSubtopic?.id ?? '');
    setSelectedIssueGroupId('');
    setSelectedDetailIssueId('');
    setUseNewCategory(false);
    setUseNewSubtopic(false);
    setUseNewIssueGroup(false);
    setUseNewDetailIssue(false);
    setQuery('');
  }

  function selectSubtopic(nextSubtopic: Subtopic) {
    setSelectedSubtopicId(nextSubtopic.id);
    setSelectedIssueGroupId('');
    setSelectedDetailIssueId('');
    setUseNewSubtopic(false);
    setUseNewIssueGroup(false);
    setUseNewDetailIssue(false);
    setQuery('');
  }

  function selectIssueGroup(issueId: string) {
    const issue = data.issueGroups.find((item) => item.id === issueId);
    setSelectedIssueGroupId(issueId);
    setUseNewIssueGroup(false);
    setSelectedDetailIssueId('');
    setUseNewDetailIssue(false);
    setOwnerName(issue?.ownerName ?? '');
    setOwnerDepartment(issue?.ownerResearchGroup ?? '');
    setRelatedDepartment(issue?.relatedDepartment ?? '');
  }

  function selectDetailIssue(detailIssueId: string) {
    const detailIssue = data.detailIssues.find((item) => item.id === detailIssueId);
    setUseNewDetailIssue(false);
    setSelectedDetailIssueId(detailIssueId);
    setOwnerName(detailIssue?.ownerName ?? selectedIssueGroup?.ownerName ?? '');
    setOwnerDepartment(detailIssue?.ownerResearchGroup ?? selectedIssueGroup?.ownerResearchGroup ?? '');
    setRelatedDepartment(detailIssue?.relatedDepartment ?? selectedIssueGroup?.relatedDepartment ?? '');
  }

  function submit() {
    if (!summary.trim()) return;
    const now = new Date().toISOString();
    const referenceLinks = referenceUrlText
      .split(/\n|,/)
      .map((url) => url.trim())
      .filter(Boolean);

    if (editingEntry) {
      const updatedDetailIssue = selectedDetailIssue
        ? {
            ...selectedDetailIssue,
            ownerName: ownerName.trim() || undefined,
            ownerResearchGroup: ownerDepartment.trim() || undefined,
            relatedDepartment: relatedDepartment.trim() || undefined,
          }
        : undefined;
      onUpdateEntry?.({
        ...editingEntry,
        date,
        status,
        changesDetailIssueStatus: changesStatus,
        recordType,
        summary: summary.trim(),
        details: details.trim() || summary.trim(),
        remainingRisk: remainingRisk.trim(),
        blockName: STATUS_LABELS[status],
        referenceLinks,
        updatedAt: now,
      }, updatedDetailIssue);
      return;
    }

    const timestamp = Date.now();
    const category: Category | undefined = useNewCategory
      ? {
          id: `category-${timestamp}`,
          label: newCategoryLabel.trim() || '새 대분류',
          description: `${newCategoryLabel.trim() || '새 대분류'} 관련 이슈`,
          order: data.categories.length + 1,
          icon: newCategoryIcon.trim() || CATEGORY_ICON_OPTIONS[0],
        }
      : selectedCategory;
    if (!category) return;

    const subtopic: Subtopic | undefined = useNewSubtopic || useNewCategory
      ? {
          id: `subtopic-${timestamp}`,
          categoryId: category.id,
          label: newSubtopicLabel.trim() || '새 하위 주제',
          order: subtopicsForCategory.length + 1,
        }
      : selectedSubtopic;
    if (!subtopic) return;

    const issueGroup: IssueGroup | undefined = useNewIssueGroup
      ? {
          id: `issue-${timestamp}`,
          title: newIssueTitle.trim() || summary.trim(),
          categoryId: category.id,
          subtopicId: subtopic.id,
          status,
          statusSource: 'auto',
          firstOccurredAt: date,
          latestUpdatedAt: date,
          currentSummary: summary.trim(),
          tags: [subtopic.label, newIssueLabel.trim()].filter(Boolean),
          groupLabel: newIssueLabel.trim() || subtopic.label,
          groupColorTone: 'neutral',
          ownerName: ownerName.trim() || undefined,
          ownerResearchGroup: ownerDepartment.trim() || undefined,
          relatedDepartment: relatedDepartment.trim() || undefined,
          sensitive: false,
          archived: false,
        }
      : selectedIssueGroup;
    if (!issueGroup) return;

    const detailIssue: DetailIssue = useNewDetailIssue || useNewIssueGroup || !selectedDetailIssue
      ? {
          id: `detail-${timestamp}`,
          issueGroupId: issueGroup.id,
          title: newDetailTitle.trim() || summary.trim(),
          status,
          firstOccurredAt: date,
          latestUpdatedAt: date,
          currentSummary: summary.trim(),
          tags: issueGroup.tags.slice(0, 2),
          ownerName: ownerName.trim() || undefined,
          ownerResearchGroup: ownerDepartment.trim() || undefined,
          relatedDepartment: relatedDepartment.trim() || undefined,
          needsReview: false,
          archived: false,
        }
      : {
          ...selectedDetailIssue,
          ownerName: ownerName.trim() || undefined,
          ownerResearchGroup: ownerDepartment.trim() || undefined,
          relatedDepartment: relatedDepartment.trim() || undefined,
        };

    onAddEntry(
      issueGroup,
      detailIssue,
      {
        id: `hist-${timestamp}`,
        issueGroupId: issueGroup.id,
        detailIssueId: detailIssue.id,
        date,
        status,
        changesDetailIssueStatus: changesStatus,
        recordType,
        summary: summary.trim(),
        details: details.trim() || summary.trim(),
        remainingRisk: remainingRisk.trim(),
        blockName: STATUS_LABELS[status],
        referenceLinks,
        authorName: '관리자',
        createdAt: now,
        updatedAt: now,
      },
      {
        isNewIssueGroup: useNewIssueGroup,
        isNewDetailIssue: useNewDetailIssue || useNewIssueGroup || !selectedDetailIssue,
        category: useNewCategory ? category : undefined,
        subtopic: useNewSubtopic || useNewCategory ? subtopic : undefined,
      },
    );
  }

  return (
    <aside className="drawer add-history-drawer" aria-label={isEditing ? '이력 수정' : '이력 추가'}>
      <div className="drawer__header add-history-drawer__header">
        <div>
          <h2>{isEditing ? '이력 수정' : '이력 추가'}</h2>
        </div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="닫기">
          <X size={18} />
        </button>
      </div>

      <div className="add-history-flow">
        <section className="add-history-section">
          <div className="add-history-section__title">
            <span>1</span>
            <strong>대상</strong>
          </div>
          {isEditing ? (
            <div className="target-summary-card">
              <span>{selectedIssueGroup?.groupLabel ?? '이슈'}</span>
              <strong>{selectedIssueGroup?.title ?? '-'}</strong>
              <small>{selectedDetailIssue?.title ?? '세부 항목'}</small>
            </div>
          ) : (
            <>
              <div className="cascade-picker" aria-label="이력 대상 범위">
                <details className="cascade-step" open>
                  <summary>
                    <span>대분류</span>
                    <strong>
                      {useNewCategory ? `${newCategoryIcon} ${newCategoryLabel || '새 대분류'}` : selectedCategory?.label ?? '선택 필요'}
                    </strong>
                  </summary>
                  <div className="cascade-step__body">
                    <label className="field">
                      <span>기존 대분류</span>
                      <select
                        value={selectedCategoryId}
                        onChange={(event) => {
                          const nextCategory = categories.find((category) => category.id === event.target.value);
                          if (nextCategory) selectCategory(nextCategory);
                        }}
                        disabled={useNewCategory}
                      >
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="inline-new-row">
                      <input
                        type="checkbox"
                        checked={useNewCategory}
                        onChange={(event) => {
                          setUseNewCategory(event.target.checked);
                          setUseNewSubtopic(event.target.checked);
                          setUseNewIssueGroup(event.target.checked);
                          setUseNewDetailIssue(event.target.checked);
                        }}
                      />
                      <span>새 대분류로 기록</span>
                    </label>
                    {useNewCategory && (
                      <>
                        <label className="field">
                          <span>새 대분류명</span>
                          <input value={newCategoryLabel} onChange={(event) => setNewCategoryLabel(event.target.value)} placeholder="예: 표면/품질" />
                        </label>
                        <div className="field">
                          <span>이모지</span>
                          <div className="emoji-picker" aria-label="새 대분류 이모지 선택">
                            {CATEGORY_ICON_OPTIONS.map((icon) => (
                              <button
                                aria-pressed={newCategoryIcon === icon}
                                className={`emoji-option ${newCategoryIcon === icon ? 'is-selected' : ''}`}
                                key={icon}
                                type="button"
                                onClick={() => {
                                  setNewCategoryIcon(icon);
                                  setCustomCategoryIconInput('');
                                }}
                              >
                                {icon}
                              </button>
                            ))}
                          </div>
                          <input
                            aria-label="이모지 직접 입력"
                            className="emoji-custom-input"
                            maxLength={4}
                            placeholder="직접 입력"
                            value={customCategoryIconInput}
                            onChange={(event) => {
                              setCustomCategoryIconInput(event.target.value);
                              setNewCategoryIcon(event.target.value || CATEGORY_ICON_OPTIONS[0]);
                            }}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </details>

                <details className="cascade-step" open>
                  <summary>
                    <span>하위 주제</span>
                    <strong>{useNewSubtopic || useNewCategory ? newSubtopicLabel || '새 하위 주제' : selectedSubtopic?.label ?? '선택 필요'}</strong>
                  </summary>
                  <div className="cascade-step__body">
                    <label className="field">
                      <span>기존 하위 주제</span>
                      <select
                        value={selectedSubtopicId}
                        onChange={(event) => {
                          const nextSubtopic = subtopicsForCategory.find((subtopic) => subtopic.id === event.target.value);
                          if (nextSubtopic) selectSubtopic(nextSubtopic);
                        }}
                        disabled={useNewSubtopic || useNewCategory}
                      >
                        {subtopicsForCategory.map((subtopic) => (
                          <option key={subtopic.id} value={subtopic.id}>
                            {subtopic.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="inline-new-row">
                      <input
                        type="checkbox"
                        checked={useNewSubtopic || useNewCategory}
                        disabled={useNewCategory}
                        onChange={(event) => {
                          setUseNewSubtopic(event.target.checked);
                          setUseNewIssueGroup(event.target.checked);
                          setUseNewDetailIssue(event.target.checked);
                        }}
                      />
                      <span>새 하위 주제로 기록</span>
                    </label>
                    {(useNewSubtopic || useNewCategory) && (
                      <label className="field">
                        <span>새 하위 주제명</span>
                        <input value={newSubtopicLabel} onChange={(event) => setNewSubtopicLabel(event.target.value)} placeholder="예: STS-430" />
                      </label>
                    )}
                  </div>
                </details>
              </div>
            </>
          )}
        </section>

        {!isEditing && (
          <section className="add-history-section">
            <div className="add-history-section__title">
              <span>2</span>
              <strong>이슈와 세부 항목</strong>
            </div>
            <>
              <label className="field">
                <span>찾기</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="이슈명, 담당자, 담당부서, 키워드"
                  aria-label="이슈 통합 검색"
                  disabled={useNewIssueGroup}
                />
              </label>

              <div className="cascade-picker">
                <details className="cascade-step" open>
                  <summary>
                    <span>이슈</span>
                    <strong>{useNewIssueGroup ? newIssueTitle || '새 이슈' : selectedIssueGroup?.title ?? '선택 필요'}</strong>
                  </summary>
                  <div className="cascade-step__body">
                    <label className="field">
                      <span>기존 이슈</span>
                      <select
                        value={selectedIssueGroupId}
                        onChange={(event) => selectIssueGroup(event.target.value)}
                        disabled={useNewIssueGroup}
                      >
                        <option value="">이슈를 선택하세요</option>
                        {issueGroups.map((issue) => (
                          <option key={issue.id} value={issue.id}>
                            {issue.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="inline-new-row">
                      <input
                        type="checkbox"
                        checked={useNewIssueGroup}
                        onChange={(event) => {
                          setUseNewIssueGroup(event.target.checked);
                          setUseNewDetailIssue(event.target.checked);
                          if (event.target.checked) setSelectedIssueGroupId('');
                        }}
                      />
                      <span>새 이슈로 기록</span>
                    </label>
                    {useNewIssueGroup && (
                      <div className="form-grid compact-form-grid">
                        <label className="field">
                          <span>새 이슈명</span>
                          <input value={newIssueTitle} onChange={(event) => setNewIssueTitle(event.target.value)} placeholder="예: STS 내식성 시험 조건 이슈" />
                        </label>
                        <label className="field">
                          <span>업무 라벨</span>
                          <input value={newIssueLabel} onChange={(event) => setNewIssueLabel(event.target.value)} placeholder="예: 시험조건, 표면결함개선" />
                        </label>
                      </div>
                    )}
                  </div>
                </details>

                <details className="cascade-step" open>
                  <summary>
                    <span>세부 항목</span>
                    <strong>{useNewDetailIssue || useNewIssueGroup ? newDetailTitle || '새 세부 항목' : selectedDetailIssue?.title ?? '선택 필요'}</strong>
                  </summary>
                  <div className="cascade-step__body">
                    <label className="field">
                      <span>기존 세부 항목</span>
                      <select
                        value={selectedDetailIssueId}
                        onChange={(event) => selectDetailIssue(event.target.value)}
                        disabled={useNewDetailIssue || useNewIssueGroup || !selectedIssueGroup}
                      >
                        <option value="">세부 항목을 선택하세요</option>
                        {recommendedDetailIssues.map((detailIssue) => (
                          <option key={detailIssue.id} value={detailIssue.id}>
                            {detailIssue.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="inline-new-row">
                      <input
                        type="checkbox"
                        checked={useNewDetailIssue || useNewIssueGroup}
                        disabled={useNewIssueGroup}
                        onChange={(event) => {
                          setUseNewDetailIssue(event.target.checked);
                          if (event.target.checked) setSelectedDetailIssueId('');
                        }}
                      />
                      <span>새 세부 항목으로 기록</span>
                    </label>
                    {(useNewDetailIssue || useNewIssueGroup) && (
                      <label className="field">
                        <span>새 세부 항목명</span>
                        <input value={newDetailTitle} onChange={(event) => setNewDetailTitle(event.target.value)} placeholder="비워두면 요약으로 생성" />
                      </label>
                    )}
                  </div>
                </details>
              </div>
            </>
          </section>
        )}

        <section className="add-history-section">
          <div className="add-history-section__title">
            <span>{isEditing ? '2' : '3'}</span>
            <strong>세부 카드 담당 정보</strong>
          </div>
          <div className="form-grid compact-form-grid">
            <label className="field">
              <span>담당자</span>
              <input
                value={ownerName}
                onChange={(event) => setOwnerName(event.target.value)}
                placeholder="예: 김연구, 박연구"
              />
            </label>
            <label className="field">
              <span>담당부서</span>
              <input
                value={ownerDepartment}
                onChange={(event) => setOwnerDepartment(event.target.value)}
                placeholder="예: 표면품질연구그룹, STS솔루션팀"
              />
            </label>
            <label className="field">
              <span>유관부서</span>
              <input
                value={relatedDepartment}
                onChange={(event) => setRelatedDepartment(event.target.value)}
                placeholder="예: 냉연품질보증섹션, 분석시험센터"
              />
            </label>
          </div>
        </section>

        <section className="add-history-section">
          <div className="add-history-section__title">
            <span>{isEditing ? '3' : '4'}</span>
            <strong>기록 내용</strong>
          </div>
          <div className="form-grid">
            <label className="field">
              <span>날짜</span>
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </label>
            <div className="field phase-field">
              <span>상태</span>
              <div className="status-option-grid phase-option-grid" role="group" aria-label="상태">
                {phaseOptions.map(([value, label]) => (
                  <button
                    className={`status-option phase-${value} ${phase === value ? 'is-selected' : ''}`}
                    key={value}
                    type="button"
                    onClick={() => selectPhase(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="field status-field">
              <span>세부 단계</span>
              <div className="status-option-grid" role="group" aria-label="세부 항목 상태">
                {statusOptions.map(([value, label]) => (
                  <button
                    className={`status-option status-${value} ${status === value ? 'is-selected' : ''}`}
                    key={value}
                    type="button"
                    onClick={() => setStatus(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="field record-type-field">
              <span>유형</span>
              <div className="status-option-grid record-type-grid" role="group" aria-label="유형">
                {recordTypeOptions.map(([value, label]) => (
                  <button
                    className={`status-option record-type-option ${recordType === value ? 'is-selected' : ''}`}
                    key={value}
                    type="button"
                    onClick={() => setRecordType(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <label className="checkbox-field">
            <input type="checkbox" checked={changesStatus} onChange={(event) => setChangesStatus(event.target.checked)} />
            <span>필요할 때만 이 기록의 세부 단계를 이슈 대표 상태에도 반영합니다.</span>
          </label>

          <label className="field">
            <span>요약</span>
            <input value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="예: 압연 조건 변경 후 재발 확인" />
          </label>
          <label className="field">
            <span>상세 내용</span>
            <textarea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              onKeyDown={(event) => insertListSeparator(event, details, setDetails)}
              placeholder="- 항목 입력 후 Enter로 다음 항목"
              rows={4}
            />
          </label>
          <label className="field">
            <span>향후 계획</span>
            <textarea
              value={remainingRisk}
              onChange={(event) => setRemainingRisk(event.target.value)}
              onKeyDown={(event) => insertListSeparator(event, remainingRisk, setRemainingRisk)}
              placeholder="- 항목 입력 후 Enter로 다음 항목"
              rows={3}
            />
          </label>
          <label className="field">
            <span>첨부 URL (여러 개 가능)</span>
            <textarea
              value={referenceUrlText}
              onChange={(event) => setReferenceUrlText(event.target.value)}
              placeholder={'https://...\nhttps://...'}
              rows={2}
            />
          </label>
        </section>
      </div>

      <div className="drawer-footer">
        <button className="primary-button full-width" type="button" onClick={submit}>
          {isEditing ? '이력 수정 저장' : '이력 추가'}
        </button>
      </div>
    </aside>
  );
}
