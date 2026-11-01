import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { normalizeMath } from '@/components/content/mathContent.js';
import katex from 'katex';
import { useId, useMemo, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { MathFormula } from '@/components/content/MathFormula.jsx';
import { Field } from './Fields.jsx';

export const LATEX_SNIPPETS = [
  { label: 'a/b', latex: '\\frac{a}{b}', get title() { return uiText("Fraction"); } },
  { label: '√x', latex: '\\sqrt{x}', get title() { return uiText("Square root"); } },
  { label: 'ⁿ√x', latex: '\\sqrt[n]{x}', get title() { return uiText("nth root"); } },
  { label: 'x²', latex: 'x^{2}', get title() { return uiText("Power"); } },
  { label: 'xₙ', latex: 'x_{n}', get title() { return uiText("Subscript"); } },
  { label: '∠', latex: '\\angle ', get title() { return uiText("Angle"); } },
  { label: '°', latex: '^\\circ', get title() { return uiText("Degree"); } },
  { label: '△', latex: '\\triangle ', get title() { return uiText("Triangle"); } },
  { label: 'θ', latex: '\\theta', get title() { return uiText("Theta"); } },
  { label: 'π', latex: '\\pi', get title() { return uiText("Pi"); } },
  { label: '≤', latex: '\\le ', get title() { return uiText("Less or equal"); } },
  { label: '≥', latex: '\\ge ', get title() { return uiText("Greater or equal"); } },
  { label: '≠', latex: '\\ne ', get title() { return uiText("Not equal"); } },
  { label: '±', latex: '\\pm ', get title() { return uiText("Plus minus"); } },
  { label: '×', latex: '\\times ', get title() { return uiText("Times"); } },
  { label: '⇒', latex: '\\Rightarrow ', get title() { return uiText("Implies"); } },
  { label: 'sin', latex: '\\sin\\theta', get title() { return uiText("Sine"); } },
  { label: '∫', latex: '\\int_{a}^{b} f(x)\\,dx', get title() { return uiText("Integral"); } },
  { label: 'Σ', latex: '\\sum_{i=1}^{n} i', get title() { return uiText("Summation"); } },
  { label: 'lim', latex: '\\lim_{x \\to 0} f(x)', get title() { return uiText("Limit"); } },
  { label: 'd/dx', latex: '\\frac{d}{dx}', get title() { return uiText("Derivative"); } },
  { label: 'vec', latex: '\\vec{a}', get title() { return uiText("Vector"); } },
  { label: '[ ]', latex: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}', get title() { return uiText("Matrix"); } },
  { label: '|A|', latex: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}', get title() { return uiText("Determinant"); } },
  { label: '{ }', latex: '\\begin{cases} x + y = 5 \\\\ x - y = 1 \\end{cases}', get title() { return uiText("System of equations"); } },
];

export function latexError(latex) {
  if (!latex?.trim()) return null;
  try {
    katex.renderToString(normalizeMath(latex).latex, { throwOnError: true, strict: 'ignore' });
    return null;
  } catch (error) {
    return error.message.replace(/^KaTeX parse error: /, '');
  }
}

/** LaTeX editor with snippet palette and live KaTeX preview. */
export function FormulaInput({ label = uiText("Formula (LaTeX)"), value, onChange, hint, rows = 2, display = true, autoFocus }) {
  useUiLanguage();
  const id = useId();
  const ref = useRef(null);
  const error = useMemo(() => latexError(value), [value]);

  const insert = (snippet) => {
    const el = ref.current;
    const text = value || '';
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const next = `${text.slice(0, start)}${snippet}${text.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + snippet.length, start + snippet.length);
    });
  };

  return (
    <Field label={label} hint={hint || uiText("Example: x^2 + 2x + 1 = 0 · \\frac{a}{b} · \\angle A = 60^\\circ")} error={error} htmlFor={id}>
      <div className="mb-1.5 flex flex-wrap gap-1">
        {LATEX_SNIPPETS.map((s) => (
          <button key={s.title} type="button" title={s.title} onClick={() => insert(s.latex)} className="h-7 min-w-8 rounded-md border bg-background px-1.5 text-xs font-medium hover:border-brand/40 hover:text-brand">
            {s.label}
          </button>
        ))}
      </div>
      <Textarea
        ref={ref}
        id={id}
        rows={rows}
        value={value || ''}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className="font-mono text-sm"
        aria-invalid={Boolean(error)}
      />
      {value?.trim() && !error && (
        <div className="mt-2 rounded-lg border border-dashed bg-paper px-3 py-2 dark:bg-muted/40" aria-label={uiText("Formula preview")}>
          <MathFormula latex={value} display={display} />
        </div>
      )}
    </Field>
  );
}
