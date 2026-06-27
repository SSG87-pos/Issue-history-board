import { describe, expect, it } from 'vitest';
import { exportReportAsDocx, exportReportAsHtml, exportReportDataAsXlsx, filterReportData } from './reportExports';
import { seedData } from './seedData';

const decoder = new TextDecoder();

describe('report exports', () => {
  it('filters the board data by category and subtopic while preserving related details', () => {
    const filtered = filterReportData(seedData, {
      categoryId: 'grade-product',
      subtopicId: 'sts',
    });

    expect(filtered.categories.map((category) => category.id)).toEqual(['grade-product']);
    expect(filtered.subtopics.map((subtopic) => subtopic.id)).toEqual(['sts']);
    expect(filtered.issueGroups.map((issue) => issue.id)).toEqual([
      'issue-sts-430-surface',
      'issue-sts-corrosion-test',
    ]);
    expect(filtered.historyEntries).toHaveLength(5);
    expect(filtered.detailIssues.every((detail) => filtered.issueGroups.some((issue) => issue.id === detail.issueGroupId))).toBe(true);
  });

  it('exports only the selected report scope to xlsx', () => {
    const xlsx = exportReportDataAsXlsx(seedData, { subtopicId: 'sts' });
    const text = decoder.decode(xlsx);

    expect(text).toContain('STS 내식성 시험 조건 이슈');
    expect(text).toContain('시험 조건 편차 원인 검토');
    expect(text).not.toContain('공동연구 샘플 반출 승인 지연');
    expect(text).not.toContain('HPF 성형 조건 검증 지연');
  });

  it('exports a Word report document with issue summaries and history rows', () => {
    const docx = exportReportAsDocx(seedData, {
      subtopicId: 'sts',
      title: 'STS 보고서',
    });
    const text = decoder.decode(docx);

    expect(text).toContain('word/document.xml');
    expect(text).toContain('STS 보고서');
    expect(text).toContain('STS 내식성 시험 조건 이슈');
    expect(text).toContain('시험 조건 편차 원인 검토');
    expect(text).toContain('담당: 박연구');
    expect(text).not.toContain('공동연구 샘플 반출 승인 지연');
  });

  it('exports a styled HTML report for browser reading and printing', () => {
    const html = exportReportAsHtml(seedData, {
      subtopicId: 'sts',
      title: 'STS HTML 보고서',
    });
    const text = decoder.decode(html);

    expect(text).toContain('<!doctype html>');
    expect(text).toContain('STS HTML 보고서');
    expect(text).toContain('PosLAB 이력관리 센터');
    expect(text).toContain('STS 내식성 시험 조건 이슈');
    expect(text).toContain('시험 조건 편차 원인 검토');
    expect(text).toContain('status-pill');
    expect(text).not.toContain('공동연구 샘플 반출 승인 지연');
  });

  it('renders uploaded HTML templates with report tokens and removes scripts', () => {
    const html = exportReportAsHtml(
      {
        ...seedData,
        settings: {
          ...seedData.settings,
          reportHtmlTemplate: `
            <html>
              <body onload="alert('x')">
                <script>alert('x')</script>
                <h1>{{ reportTitle }}</h1>
                <p>{{generatedAt}}</p>
                <section>{{summaryCards}}</section>
                <main>{{issueCards}}</main>
              </body>
            </html>
          `,
          reportHtmlTemplateName: 'custom.html',
        },
      },
      {
        subtopicId: 'sts',
        title: '커스텀 HTML 보고서',
      },
    );
    const text = decoder.decode(html);

    expect(text).toContain('커스텀 HTML 보고서');
    expect(text).toContain('STS 내식성 시험 조건 이슈');
    expect(text).toContain('class="stat"');
    expect(text).not.toContain('<script>');
    expect(text).not.toContain('onload=');
  });

  it('exports configured status and record type labels in Word reports', () => {
    const docx = exportReportAsDocx(
      {
        ...seedData,
        historyEntries: seedData.historyEntries.map((entry, index) =>
          index === 0 ? { ...entry, status: 'actioning', recordType: 'action' } : entry,
        ),
        settings: {
          statusLabels: { actioning: '조치 진행' },
          recordTypeLabels: { action: '액션 기록' },
        },
      },
      {
        title: '옵션 보고서',
      },
    );
    const text = decoder.decode(docx);

    expect(text).toContain('조치 진행');
    expect(text).toContain('액션 기록');
  });

  it('filters delayed report templates to long-running unresolved issues', () => {
    const delayed = filterReportData(seedData, { template: 'delayed' });
    const titles = delayed.issueGroups.map((issue) => issue.title);

    expect(titles).toContain('후판 초음파 탐상 재검 일정 조정');
    expect(titles).toContain('시험 의뢰 기준 개정 논의');
    expect(titles).not.toContain('STS 내식성 시험 조건 이슈');
    expect(delayed.historyEntries.length).toBeGreaterThan(0);
  });

  it('exports an empty Word report with a clear empty-state message', () => {
    const emptyScoped = filterReportData(seedData, {
      subtopicId: 'sts',
      dateFrom: '2026-06-26',
      dateTo: '2026-06-27',
    });
    const docx = exportReportAsDocx(seedData, {
      subtopicId: 'sts',
      dateFrom: '2026-06-26',
      dateTo: '2026-06-27',
      title: 'STS 빈 결과 보고서',
    });
    const text = decoder.decode(docx);

    expect(emptyScoped.historyEntries).toHaveLength(0);
    expect(text).toContain('STS 빈 결과 보고서');
    expect(text).toContain('이력: 0건');
    expect(text).toContain('선택한 조건에 해당하는 이력이 없습니다.');
    expect(text).toContain('기간 2026-06-26 ~ 2026-06-27');

    const html = decoder.decode(
      exportReportAsHtml(seedData, {
        subtopicId: 'sts',
        dateFrom: '2026-06-26',
        dateTo: '2026-06-27',
        title: 'STS 빈 결과 HTML 보고서',
      }),
    );
    expect(html).toContain('STS 빈 결과 HTML 보고서');
    expect(html).toContain('선택한 조건에 해당하는 이력이 없습니다.');
  });
});
