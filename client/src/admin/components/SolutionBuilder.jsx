import { adminText } from '../lib/format.js';
import { uiTemplate } from '@/lib/uiLanguage.js';
import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  Copy,
  DraftingCompass,
  Eye,
  EyeOff,
  Footprints,
  Image as ImageIcon,
  Languages,
  Lightbulb,
  LineChart,
  Info,
  Calculator,
  PenTool,
  Plus,
  Shapes,
  Sigma,
  Table,
  Trash2,
  Type,
  MonitorPlay as Youtube,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { get } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useConfirm } from './ConfirmDialog.jsx';
import { L10nField, LanguageModeField, SelectField, SwitchField } from './fields/Fields.jsx';
import { FormulaInput } from './fields/FormulaInput.jsx';
import { RichL10nField } from './fields/RichL10nField.jsx';
import { VideoField } from './fields/VideoField.jsx';
import { MediaListField } from './media/MediaFields.jsx';
import { DragHandle, SortableList, clientKey, itemKey, moveItem } from './SortableList.jsx';
import { stripTags } from '../lib/format.js';

export const BLOCK_META = {
  text: { get label() { return uiText("Text"); }, get group() { return uiText("Text"); }, icon: Type },
  hindiText: { get label() { return uiText("Hindi text"); }, get group() { return uiText("Text"); }, icon: Languages, modes: ['hi'] },
  englishText: { get label() { return uiText("English text"); }, get group() { return uiText("Text"); }, icon: Languages, modes: ['en'] },
  explanation: { get label() { return uiText("Explanation / Given"); }, get group() { return uiText("Text"); }, icon: Info },
  step: { get label() { return uiText("Step"); }, get group() { return uiText("Steps"); }, icon: Footprints, latex: true },
  calculation: { get label() { return uiText("Calculation"); }, get group() { return uiText("Steps"); }, icon: Calculator, latexPrimary: true },
  construction: { get label() { return uiText("Steps of construction"); }, get group() { return uiText("Steps"); }, icon: DraftingCompass },
  formula: { get label() { return uiText("Formula"); }, get group() { return uiText("Math"); }, icon: Sigma, latexPrimary: true },
  table: { get label() { return uiText("Table"); }, get group() { return uiText("Math"); }, icon: Table },
  image: { get label() { return uiText("Image"); }, get group() { return uiText("Visual"); }, icon: ImageIcon, media: true },
  diagram: { get label() { return uiText("Diagram"); }, get group() { return uiText("Visual"); }, icon: PenTool, media: true },
  graph: { get label() { return uiText("Graph"); }, get group() { return uiText("Visual"); }, icon: LineChart, media: true },
  youtube: { get label() { return uiText("YouTube video"); }, get group() { return uiText("Media"); }, icon: Youtube, video: true },
  note: { get label() { return uiText("Important note"); }, get group() { return uiText("Callouts"); }, icon: Info },
  tip: { get label() { return uiText("Tip"); }, get group() { return uiText("Callouts"); }, icon: Lightbulb },
  warning: { get label() { return uiText("Warning"); }, get group() { return uiText("Callouts"); }, icon: AlertTriangle },
  finalAnswer: { get label() { return uiText("Final answer"); }, get group() { return uiText("Result"); }, icon: CheckCircle2, latex: true },
};

const GROUPS = ['Text', 'Steps', 'Math', 'Visual', 'Media', 'Callouts', 'Result'];
const TYPE_OPTIONS = Object.entries(BLOCK_META).map(([value, meta]) => ({ value, get label() { return meta.label; } }));

export const newBlock = (type) => ({ _key: clientKey(), type, title: {}, content: {}, latex: '', displayMode: true, media: [], video: null, languageMode: 'auto', isVisible: true });

export const blocksFromTemplate = (blocks = []) =>
  blocks.map(({ _id, ...block }) => ({ ...newBlock(block.type), ...block, _key: clientKey(), media: block.media || [] }));

function summary(block) {
  if (BLOCK_META[block.type]?.media) return `${block.media?.length || 0} image(s)`;
  if (block.type === 'youtube') return block.video?.title?.en || block.video?.youtubeId || 'No video selected';
  const text = stripTags(adminText(block.content)) || block.latex || adminText(block.title);
  return text ? text.slice(0, 90) : 'Empty';
}

function BlockEditor({ block, onChange }) {
  useUiLanguage();
  const meta = BLOCK_META[block.type] || BLOCK_META.text;
  const set = (patch) => onChange({ ...block, ...patch });
  const modes = meta.modes || ['hi', 'en'];
  const forced = Boolean(meta.modes);
  const [showLatex, setShowLatex] = useState(Boolean(block.latex));

  if (meta.media) {
    return (
      <div className="space-y-3">
        <L10nField label={uiText("Heading (optional)")} value={block.title} onChange={(title) => set({ title })} placeholder={meta.label} />
        <MediaListField label={uiTemplate`${meta.label} images`} hint={uiText("Unlimited images. Students can tap to zoom.")} value={block.media} onChange={(media) => set({ media })} kind="diagrams" />
      </div>
    );
  }
  if (meta.video) {
    return (
      <div className="space-y-3">
        <VideoField value={block.video} onChange={(video) => set({ video })} />
        <L10nField label={uiText("Title override (optional)")} value={block.title} onChange={(title) => set({ title })} />
      </div>
    );
  }
  if (meta.latexPrimary) {
    return (
      <div className="space-y-3">
        <L10nField label={uiText("Heading (optional)")} value={block.title} onChange={(title) => set({ title })} placeholder={meta.label} />
        <FormulaInput value={block.latex} onChange={(latex) => set({ latex })} display={block.displayMode !== false} />
        {block.type === 'formula' && <SwitchField label={uiText("Display centered on its own line")} checked={block.displayMode !== false} onChange={(displayMode) => set({ displayMode })} />}
        <RichL10nField label={uiText("Explanation (optional)")} value={block.content} onChange={(content) => set({ content })} minimal />
        <LanguageModeField value={block.languageMode} onChange={(languageMode) => set({ languageMode })} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <L10nField label={uiText("Heading (optional)")} value={block.title} onChange={(title) => set({ title })} placeholder={meta.label} />
      <RichL10nField
        label={forced ? `${meta.label}` : uiText("Content")}
        hint={block.type === 'table' ? uiText("Use the table button in the toolbar.") : block.type === 'construction' ? uiText("Use a numbered list for construction steps.") : undefined}
        value={block.content}
        onChange={(content) => set({ content })}
        modes={modes}
        minimal={['step', 'finalAnswer', 'note', 'tip', 'warning'].includes(block.type)}
      />
      {meta.latex &&
        (showLatex ? (
          <FormulaInput label={uiText("Formula line (optional)")} value={block.latex} onChange={(latex) => set({ latex })} />
        ) : (
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowLatex(true)}>
            <Sigma />{uiText("Add a formula line")}</Button>
        ))}
      {!forced && <LanguageModeField value={block.languageMode} onChange={(languageMode) => set({ languageMode })} />}
    </div>
  );
}

function AddBlockMenu({ onAdd, label = uiText("Add block"), variant = 'default' }) {
  useUiLanguage();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant={variant} size="sm">
          <Plus /> {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[70vh] w-60 overflow-y-auto">
        {GROUPS.map((group, i) => (
          <DropdownMenuGroup key={group}>
            {i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-[10px] tracking-wide uppercase">{group}</DropdownMenuLabel>
            {Object.entries(BLOCK_META)
              .filter(([, meta]) => meta.group === group)
              .map(([type, meta]) => {
                const IconComponent = meta.icon;
                return (
                  <DropdownMenuItem key={type} onSelect={() => onAdd(type)}>
                    <IconComponent /> {meta.label}
                  </DropdownMenuItem>
                );
              })}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Block-based solution builder: Explanation → Steps → Formula → Diagram → Video → Final Answer, in any order. */
export function SolutionBuilder({ blocks = [], onChange, templateKind = 'question', onTemplateApplied }) {
  useUiLanguage();
  const confirm = useConfirm();
  const [collapsed, setCollapsed] = useState({});
  const items = blocks.map((b) => (itemKey(b) ? b : { ...b, _key: clientKey() }));
  const templates = useQuery({ queryKey: ['admin', 'templates', 'list', templateKind], queryFn: () => get('/templates', { scope: 'admin', kind: templateKind, limit: 100 }) });

  const update = (index, block) => onChange(items.map((b, i) => (i === index ? block : b)));
  const add = (type, at = items.length) => onChange([...items.slice(0, at), newBlock(type), ...items.slice(at)]);

  const applyTemplate = async (template) => {
    const fresh = blocksFromTemplate(template.blocks);
    if (items.length) {
      const replace = await confirm({
        get title() { return uiTemplate`Apply “${template.name}”?`; },
        get description() { return uiText("Replace the current blocks with this template? (Choose Cancel to keep your blocks — you can add blocks individually instead.)"); },
        get confirmLabel() { return uiText("Replace blocks"); },
        destructive: true,
      });
      if (!replace) return;
    }
    onChange(fresh);
    onTemplateApplied?.(template);
  };

  let step = 0;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <AddBlockMenu onAdd={(type) => add(type)} />
        {templates.data?.items?.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                <Shapes />{uiText("Apply template")}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72">
              {templates.data.items.map((template) => (
                <DropdownMenuItem key={template._id} onSelect={() => applyTemplate(template)} className="flex-col items-start gap-0.5">
                  <span className="font-semibold">{template.name}</span>
                  <span className="text-xs text-muted-foreground">{template.description?.en || template.blocks.map((b) => BLOCK_META[b.type]?.label).join(' → ')}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {items.length > 1 && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setCollapsed(Object.fromEntries(items.map((b) => [itemKey(b), !Object.values(collapsed).every(Boolean)])))}>
            <ChevronDown />{' '}{uiText("Collapse / expand all")}{' '}</Button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">{items.length}{' '}{uiText("block(s) · drag to reorder")}</span>
      </div>

      {items.length === 0 && (
        <div className="rounded-2xl border border-dashed p-6 text-center">
          <p className="text-sm font-semibold">{uiText("No solution blocks yet")}</p>
          <p className="mb-3 text-xs text-muted-foreground">{uiText("Start with a template or add blocks one by one.")}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {['explanation', 'step', 'formula', 'diagram', 'finalAnswer'].map((type) => (
              <Button key={type} type="button" variant="outline" size="sm" onClick={() => add(type)}>
                <Plus /> {BLOCK_META[type].label}
              </Button>
            ))}
          </div>
        </div>
      )}

      <SortableList
        items={items}
        onChange={onChange}
        className="space-y-3"
        renderItem={(block, index, { ref, style, handleProps, isDragging }) => {
          const meta = BLOCK_META[block.type] || BLOCK_META.text;
          const IconComponent = meta.icon;
          const key = itemKey(block);
          const isCollapsed = collapsed[key];
          if (block.type === 'step' || block.type === 'calculation') step += 1;
          return (
            <li ref={ref} style={style} className={cn('rounded-2xl border bg-card', isDragging && 'shadow-xl ring-2 ring-brand/40', block.isVisible === false && 'opacity-60')}>
              <div className="flex flex-wrap items-center gap-1.5 border-b px-2 py-1.5">
                <DragHandle {...handleProps} />
                <span className="grid size-6 place-items-center rounded-md bg-muted text-[11px] font-bold">{index + 1}</span>
                <IconComponent className="size-4 text-brand" aria-hidden="true" />
                <div className="w-44">
                  <SelectField value={block.type} onChange={(type) => update(index, { ...block, type })} options={TYPE_OPTIONS} />
                </div>
                {(block.type === 'step' || block.type === 'calculation') && <span className="text-xs text-muted-foreground">{uiText("Step")}{step}</span>}
                {isCollapsed && <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{summary(block)}</span>}
                <span className="ml-auto flex items-center">
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => update(index, { ...block, isVisible: block.isVisible === false })} aria-label={block.isVisible === false ? uiText("Show block") : uiText("Hide block")} title={block.isVisible === false ? uiText("Hidden") : uiText("Visible")}>
                    {block.isVisible === false ? <EyeOff /> : <Eye />}
                  </Button>
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange(moveItem(items, index, index - 1))} disabled={index === 0} aria-label={uiText("Move up")}>
                    <ArrowUp />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange(moveItem(items, index, index + 1))} disabled={index === items.length - 1} aria-label={uiText("Move down")}>
                    <ArrowDown />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onChange([...items.slice(0, index + 1), { ...structuredClone({ ...block, _id: undefined }), _key: clientKey() }, ...items.slice(index + 1)])}
                    aria-label={uiText("Duplicate block")}
                  >
                    <Copy />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={async () => {
                      const ok = await confirm({ get title() { return uiText("Delete this block?"); }, description: `${meta.label}: ${summary(block)}`, get confirmLabel() { return uiText("Delete block"); }, destructive: true });
                      if (ok) onChange(items.filter((_, i) => i !== index));
                    }}
                    aria-label={uiText("Delete block")}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => setCollapsed((c) => ({ ...c, [key]: !isCollapsed }))} aria-label={isCollapsed ? uiText("Expand") : uiText("Collapse")} aria-expanded={!isCollapsed}>
                    <ChevronDown className={cn('transition-transform', isCollapsed && '-rotate-90')} />
                  </Button>
                </span>
              </div>
              {!isCollapsed && (
                <div className="p-3 sm:p-4">
                  <BlockEditor block={block} onChange={(next) => update(index, next)} />
                </div>
              )}
            </li>
          );
        }}
      />

      {items.length > 0 && <AddBlockMenu onAdd={(type) => add(type)} label={uiText("Add another block")} variant="outline" />}
    </div>
  );
}
