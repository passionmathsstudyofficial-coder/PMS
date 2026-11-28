import { useMemo } from 'react';
import { CheckCircle2, FileQuestion, HelpCircle, Sparkles } from 'lucide-react';
import { RichContent } from '@/components/content/RichContent.jsx';
import { SolutionRenderer } from '@/components/content/SolutionRenderer.jsx';
import { Figure } from '@/components/content/Figure.jsx';
import { uiText } from '@/lib/uiLanguage.js';
import { useL10n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * Dynamic Paper Badge & Label Generator based on page/category type.
 * - Previous Year Questions -> CBSE PYQ 2026
 * - Sample Papers -> CBSE Sample Paper 2026
 * - General/Other -> CBSE 2026
 */
export function getPaperBadgeLabel(pageType, year, board = 'CBSE', customLabel) {
  if (customLabel) return customLabel;
  const yearStr = year ? String(year).trim() : '';
  const boardPrefix = (board || 'CBSE').trim();
  const normType = String(pageType || '').toLowerCase().replace(/[-_]/g, '');

  // Previous Year Questions -> CBSE PYQ {year}
  if (
    normType === 'pyq' ||
    normType === 'previousyearquestions' ||
    normType === 'previousyearpaper'
  ) {
    return yearStr ? `${boardPrefix} PYQ ${yearStr}` : `${boardPrefix} PYQ`;
  }

  // Sample Papers -> CBSE Sample Paper {year}
  if (
    normType === 'samplepaper' ||
    normType === 'samplepapers' ||
    normType === 'cbsesamplepapers'
  ) {
    return yearStr ? `${boardPrefix} Sample Paper ${yearStr}` : `${boardPrefix} Sample Paper`;
  }

  // Default fallback
  return yearStr ? `${boardPrefix} ${yearStr}` : boardPrefix;
}

/**
 * Parses a combined question-and-answer rich text HTML into distinct questions.
 * Handles headings (h2, h3, h4), bold tags (<p><strong>Question 1...</strong></p>),
 * and solution demarcations (<h4>Solution</h4>, <strong>Solution:</strong>).
 */
export function parseQuestionPaperHtml(html) {
  if (!html || typeof html !== 'string' || !html.trim()) return [];
  if (typeof window === 'undefined') {
    return [{ questionNumber: '1', questionHtml: html, solutionHtml: '' }];
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const body = doc.body;
  const children = Array.from(body.children);
  if (children.length === 0) {
    return [{ questionNumber: '1', questionHtml: html, solutionHtml: '' }];
  }

  const isQuestionHeader = (el) => {
    const text = el.textContent?.trim() || '';
    const tag = el.tagName.toLowerCase();
    if (/^h[2-4]$/.test(tag)) {
      if (/^(?:question|q\.?|q\s*\d+|प्रश्न|प्र\.?|problem)\b/i.test(text)) return true;
      if (children.filter((c) => /^h[2-4]$/.test(c.tagName.toLowerCase())).length > 1) {
        return /^(?:question|q\.?|q\s*\d+|प्रश्न|प्र\.?|problem|\d+[\.\)])\b/i.test(text);
      }
    }
    const firstChild = el.firstElementChild;
    if (tag === 'p' && firstChild && (firstChild.tagName.toLowerCase() === 'strong' || firstChild.tagName.toLowerCase() === 'b')) {
      const strongText = firstChild.textContent?.trim() || '';
      if (/^(?:question|q\.?|q\s*\d+|प्रश्न|प्र\.?|problem|\d+[\.\)])\b/i.test(strongText)) return true;
    }
    return false;
  };

  const isSolutionHeader = (el) => {
    const text = el.textContent?.trim() || '';
    const tag = el.tagName.toLowerCase();
    if (/^h[3-6]$/.test(tag)) {
      if (/^(?:solution|answer|ans\.?|marking scheme|हल|उत्तर|स्पष्टीकरण)\b/i.test(text)) return true;
    }
    const firstChild = el.firstElementChild;
    if ((tag === 'p' || tag === 'div') && firstChild && (firstChild.tagName.toLowerCase() === 'strong' || firstChild.tagName.toLowerCase() === 'b')) {
      const strongText = firstChild.textContent?.trim() || '';
      if (/^(?:solution|answer|ans\.?|marking scheme|हल|उत्तर|स्पष्टीकरण)\b/i.test(strongText)) return true;
    }
    return false;
  };

  const hasAnyQuestionHeaders = children.some(isQuestionHeader);

  // If there are no question headers at all, treat whole content as one question
  if (!hasAnyQuestionHeaders) {
    const solutionIdx = children.findIndex(isSolutionHeader);
    if (solutionIdx !== -1) {
      const qElements = children.slice(0, solutionIdx).map((c) => c.outerHTML).join('');
      const sElements = children.slice(solutionIdx).map((c) => c.outerHTML).join('');
      return [{
        questionNumber: '1',
        questionHtml: qElements || html,
        solutionHtml: sElements,
      }];
    }
    return [{ questionNumber: '1', questionHtml: html, solutionHtml: '' }];
  }

  // Group elements into distinct questions
  const groups = [];
  let current = null;
  let inSolution = false;

  for (const child of children) {
    if (isQuestionHeader(child)) {
      if (current) groups.push(current);
      const rawText = child.textContent?.trim() || '';
      const numMatch = rawText.match(/(?:question|q\.?|प्रश्न|प्र\.?|problem|\b)\s*([0-9]+[a-z]?)/i);
      const questionNumber = numMatch ? numMatch[1] : String(groups.length + 1);

      current = {
        questionNumber,
        headerHtml: child.outerHTML,
        questionElements: [],
        solutionElements: [],
      };
      inSolution = false;
    } else if (current && isSolutionHeader(child)) {
      inSolution = true;
      current.solutionElements.push(child.outerHTML);
    } else if (current) {
      if (inSolution) {
        current.solutionElements.push(child.outerHTML);
      } else {
        current.questionElements.push(child.outerHTML);
      }
    } else {
      if (!current) {
        current = {
          questionNumber: '1',
          headerHtml: '',
          questionElements: [child.outerHTML],
          solutionElements: [],
        };
      } else {
        current.questionElements.push(child.outerHTML);
      }
    }
  }

  if (current) groups.push(current);

  return groups.map((g, idx) => {
    let qHtml = g.questionElements.join('');
    if (g.headerHtml) {
      qHtml = g.headerHtml + qHtml;
    }
    return {
      questionNumber: g.questionNumber || String(idx + 1),
      questionHtml: qHtml || g.headerHtml,
      solutionHtml: g.solutionElements.join(''),
    };
  });
}

/**
 * Highlighting Question Card component.
 * Displays visually distinct question container with prominent question number,
 * page-based paper label (e.g. CBSE PYQ 2026 or CBSE Sample Paper 2026),
 * highlighted question statement, and answer/solution immediately underneath.
 */
export function QuestionItemCard({
  questionNumber,
  questionHtml,
  solutionHtml,
  blocks = [],
  year,
  board = 'CBSE',
  paperSet,
  marks,
  chapter,
  attachments = [],
  languageMode,
  onImageOpen,
  pageType = 'pyq',
  paperLabel,
}) {
  const t = useL10n();
  const badgeLabel = getPaperBadgeLabel(pageType, year, board, paperLabel);

  return (
    <article className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs transition hover:border-brand/40 hover:shadow-md">
      {/* Question Header */}
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-muted/30 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          {questionNumber && (
            <span className="inline-flex items-center justify-center rounded-xl bg-brand px-3 py-1 text-xs font-black text-white shadow-xs">
              {uiText("Question")} {questionNumber}
            </span>
          )}
          {badgeLabel && (
            <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-bold text-brand">
              {badgeLabel}
            </span>
          )}
          {paperSet && (
            <span className="rounded-full border border-border/70 bg-card px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              {paperSet}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 ml-auto text-xs">
          {marks ? (
            <span className="font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
              {marks} {uiText("Marks")}
            </span>
          ) : null}
          {chapter && (
            <span className="font-semibold text-brand">
              {t(chapter.title)}
            </span>
          )}
        </div>
      </header>

      <div className="p-5 sm:p-6 space-y-5">
        {/* Highlighted Question Container */}
        {questionHtml && (
          <div className="rounded-xl border-l-4 border-amber-500 bg-gradient-to-r from-amber-500/10 via-amber-500/[0.03] to-transparent p-4 sm:p-5">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 mb-2">
              <FileQuestion className="size-4 text-amber-600 dark:text-amber-400" />
              <span>{uiText("Question Statement")}</span>
            </div>
            <RichContent
              html={questionHtml}
              className="text-base font-medium text-foreground leading-relaxed [&>h3]:text-base [&>h3]:font-bold [&>h3]:mb-2 [&>h4]:text-sm [&>h4]:font-semibold"
            />
          </div>
        )}

        {/* Attachments / Diagrams */}
        {attachments.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {attachments.map((a, i) => (
              <Figure
                key={a._id || i}
                media={a.media}
                alt={t(a.alt) || t(a.media?.alt)}
                caption={t(a.caption)}
                onOpen={onImageOpen ? () => onImageOpen(i) : undefined}
              />
            ))}
          </div>
        )}

        {/* Solution Immediately Underneath */}
        {solutionHtml && (
          <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-emerald-500/[0.02] to-transparent p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span>{uiText("Step-by-Step Solution & Mathematical Explanation")}</span>
            </div>
            <RichContent
              html={solutionHtml}
              className="text-sm text-foreground leading-relaxed [&>h4]:text-xs [&>h4]:font-bold [&>h4]:text-emerald-700 dark:[&>h4]:text-emerald-400 [&>h4]:mb-2"
            />
          </div>
        )}

        {/* Solution Blocks if provided via SolutionRenderer */}
        {!solutionHtml && blocks && blocks.length > 0 && (
          <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-emerald-500/[0.02] to-transparent p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span>{uiText("Step-by-Step Solution & Mathematical Explanation")}</span>
            </div>
            <SolutionRenderer blocks={blocks} languageMode={languageMode} />
          </div>
        )}
      </div>
    </article>
  );
}

/**
 * QuestionPaperContent accepts either:
 * - A single document (with html content that might have multiple questions)
 * - Or a list of question documents
 * And renders them with highlighted question boxes, prominent question numbers,
 * dynamic paper-based labels (CBSE PYQ 2026 vs CBSE Sample Paper 2026),
 * and answers immediately underneath.
 */
export function QuestionPaperContent({
  questions = [],
  defaultYear,
  board = 'CBSE',
  paperSet,
  pageType = 'pyq',
  paperLabel,
}) {
  const t = useL10n();

  return (
    <div className="space-y-6">
      {questions.map((q, idx) => {
        const rawContent = t(q.content || q.text, q.languageMode);
        const parsedItems = parseQuestionPaperHtml(rawContent);
        const currentYear = q.year || defaultYear;
        const currentType = q.category || pageType;

        // If the document content parsed into multiple questions
        if (parsedItems.length > 1) {
          return (
            <div key={q._id || idx} className="space-y-6">
              {parsedItems.map((item, pIdx) => (
                <QuestionItemCard
                  key={`${q._id || idx}-sub-${pIdx}`}
                  questionNumber={item.questionNumber}
                  questionHtml={item.questionHtml}
                  solutionHtml={item.solutionHtml}
                  year={currentYear}
                  board={q.board || board}
                  paperSet={q.paperSet || paperSet}
                  marks={q.marks}
                  chapter={q.chapter}
                  attachments={q.attachments}
                  languageMode={q.languageMode}
                  pageType={currentType}
                  paperLabel={paperLabel}
                />
              ))}
            </div>
          );
        }

        // Single question in document
        const singleParsed = parsedItems[0] || {
          questionNumber: q.number || String(idx + 1),
          questionHtml: rawContent,
          solutionHtml: '',
        };

        return (
          <QuestionItemCard
            key={q._id || idx}
            questionNumber={singleParsed.questionNumber || q.number || String(idx + 1)}
            questionHtml={singleParsed.questionHtml || rawContent}
            solutionHtml={singleParsed.solutionHtml}
            blocks={q.blocks}
            year={currentYear}
            board={q.board || board}
            paperSet={q.paperSet || paperSet}
            marks={q.marks}
            chapter={q.chapter}
            attachments={q.attachments}
            languageMode={q.languageMode}
            pageType={currentType}
            paperLabel={paperLabel}
          />
        );
      })}
    </div>
  );
}
