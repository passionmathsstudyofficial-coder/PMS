import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { Field, L10nField } from './Fields.jsx';
import { FormulaInput } from './FormulaInput.jsx';
import { DragHandle, SortableList, clientKey, itemKey, moveItem } from '../SortableList.jsx';

export function FormulaListField({ value = [], onChange, label, hint }) {
  useUiLanguage();
  const items = (Array.isArray(value) ? value : []).map((f) => (itemKey(f) ? f : { ...f, _key: clientKey() }));
  const update = (index, patch) => onChange(items.map((f, i) => (i === index ? { ...f, ...patch } : f)));

  return (
    <Field
      label={label || uiText("Important formulas")}
      hint={hint || uiText("Shown in the “Important Formulas” box and searchable by students.")}
    >
      <SortableList
        items={items}
        onChange={onChange}
        className="space-y-3"
        renderItem={(formula, index, { ref, style, handleProps }) => (
          <li ref={ref} style={style} className="rounded-xl border bg-background p-3">
            <div className="mb-2 flex items-center gap-1">
              <DragHandle {...handleProps} />
              <span className="text-xs font-semibold text-muted-foreground">
                {uiText("Formula")} {index + 1}
              </span>
              <span className="ml-auto flex">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onChange(moveItem(items, index, index - 1))}
                  disabled={index === 0}
                  aria-label={uiText("Move up")}
                >
                  <ArrowUp />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onChange(moveItem(items, index, index + 1))}
                  disabled={index === items.length - 1}
                  aria-label={uiText("Move down")}
                >
                  <ArrowDown />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onChange(items.filter((_, i) => i !== index))}
                  aria-label={uiText("Remove formula")}
                >
                  <Trash2 className="text-destructive" />
                </Button>
              </span>
            </div>
            <div className="grid gap-3">
              <L10nField
                label={uiText("Name")}
                value={formula.title}
                onChange={(title) => update(index, { title })}
                placeholder={uiText("nth term / n वाँ पद")}
              />
              <FormulaInput value={formula.latex} onChange={(latex) => update(index, { latex })} />
              <L10nField
                label={uiText("Short description")}
                value={formula.description}
                onChange={(description) => update(index, { description })}
              />
            </div>
          </li>
        )}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2"
        onClick={() => onChange([...items, { _key: clientKey(), title: {}, latex: '', description: {} }])}
      >
        <Plus />
        {uiText("Add formula")}
      </Button>
    </Field>
  );
}

