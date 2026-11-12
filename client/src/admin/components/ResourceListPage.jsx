import { uiTemplate } from '@/lib/uiLanguage.js';
import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { ArrowUpDown, Copy, Eye, EyeOff, Loader2, MoreHorizontal, Pencil, Plus, Search, Send, Trash2, Undo2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState, ErrorState } from '@/components/site/States.jsx';
import { useAdminAuth } from '../lib/auth.jsx';
import { docLabel, timeAgo } from '../lib/format.js';
import { RESOURCES, useResourceList, useResourceMutations } from '../lib/resources.js';
import { useConfirm } from './ConfirmDialog.jsx';
import { PageHeader } from './PageHeader.jsx';
import { DragHandle, SortableList } from './SortableList.jsx';
import { StatusBadge } from './StatusBadge.jsx';

function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function ReorderPanel({ resource, params, rowLabel, onDone }) {
  useUiLanguage();
  const { reorder } = useResourceMutations(resource);
  const list = useResourceList(resource, { ...params, limit: 200 });
  const [items, setItems] = useState(null);
  useEffect(() => {
    if (list.data?.items) setItems(list.data.items);
  }, [list.data]);

  if (!items) return <Skeleton className="h-40 rounded-2xl" />;
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{uiText("Drag items (or use the handle with arrow keys) to set the order shown on the website.")}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onDone}>{uiText("Cancel")}</Button>
          <Button onClick={() => reorder.mutate(items.map((i) => i._id), { onSuccess: onDone })} disabled={reorder.isPending}>
            {reorder.isPending && <Loader2 className="animate-spin" />}{uiText("Save order")}</Button>
        </div>
      </div>
      <SortableList
        items={items}
        onChange={setItems}
        className="space-y-1.5"
        renderItem={(item, index, { ref, style, handleProps }) => (
          <li ref={ref} style={style} className="flex items-center gap-2 rounded-lg border bg-background px-2 py-1.5">
            <DragHandle {...handleProps} />
            <span className="w-6 text-xs text-muted-foreground">{index + 1}</span>
            <span className="flex-1 truncate text-sm font-medium">{rowLabel(item)}</span>
            {item.status && <StatusBadge doc={item} />}
          </li>
        )}
      />
    </div>
  );
}

/**
 * Generic admin list: search, status filter, extra filters, pagination, row actions and drag-and-drop ordering.
 * columns: [{ header, cell: (item) => node, className }]
 */
export function ResourceListPage({
  resource,
  title,
  description,
  columns,
  filters,
  baseParams = {},
  createPath,
  createLabel,
  editPath,
  reorderable = false,
  reorderDisabledReason,
  rowLabel = (item) => docLabel(item),
  hasStatus = true,
  canDuplicate = true,
  bulkStatus = false,
  showScheduledFilter = false,
  emptyTitle,
  headerActions,
  children,
}) {
  useUiLanguage();
  const meta = RESOURCES[resource];
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { can } = useAdminAuth();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [reordering, setReordering] = useState(false);
  const [selected, setSelected] = useState([]);
  const [batchStatus, setBatchStatus] = useState('');
  const [applying, setApplying] = useState(false);
  const debounced = useDebounced(q);
  const params = { ...baseParams, q: debounced || undefined, status: status || undefined, page, limit: 25 };
  const list = useResourceList(resource, params);
  const { setStatus: changeStatus, duplicate, remove } = useResourceMutations(resource);

  useEffect(() => setPage(1), [debounced, status, JSON.stringify(baseParams)]);

  const onDelete = (item) =>
    confirm({
      get title() { return uiTemplate`Delete “${rowLabel(item)}”?`; },
      get description() { return uiText("This permanently deletes only this item. Items that still contain other content are protected and cannot be deleted."); },
      get confirmLabel() { return uiText("Delete"); },
      destructive: true,
      onConfirm: () => remove.mutateAsync({ id: item._id }),
    });

  const items = list.data?.items || [];
  const canBulk = bulkStatus && can('content:publish');
  const checked = items.filter(item => selected.includes(item._id));
  useEffect(() => setSelected([]), [debounced, status, page, JSON.stringify(baseParams)]);

  const applyStatus = async () => {
    setApplying(true);
    const failed = [];
    for (const item of checked) {
      try {
        await changeStatus.mutateAsync({ id: item._id, status: batchStatus });
      } catch {
        failed.push(item._id);
      }
    }
    setSelected(failed);
    setApplying(false);
  };

  return (
    <div>
      <PageHeader
        title={title || meta.plural}
        description={description}
        actions={
          <>
            {headerActions}
            {reorderable && (
              <Button variant="outline" size="lg" onClick={() => setReordering((v) => !v)} disabled={Boolean(reorderDisabledReason)} title={reorderDisabledReason}>
                <ArrowUpDown /> {reordering ? uiText("Close ordering") : uiText("Reorder")}
              </Button>
            )}
            {createPath && (
              <Button asChild size="lg">
                <Link to={createPath}>
                  <Plus /> {createLabel || uiTemplate`New ${meta.singular}`}
                </Link>
              </Button>
            )}
          </>
        }
      />
      {reorderable && reorderDisabledReason && <p className="-mt-3 mb-4 text-xs text-muted-foreground">{reorderDisabledReason}</p>}
      {children}

      {reordering ? (
        <ReorderPanel resource={resource} params={baseParams} rowLabel={rowLabel} onDone={() => setReordering(false)} />
      ) : (
        <div className="rounded-2xl border bg-card">
          <div className="flex flex-col gap-2 border-b p-3 lg:flex-row lg:items-center">
            <label className="relative flex-1">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={uiText("Search…")} className="h-9 pl-8" aria-label={uiTemplate`Search ${meta.plural}`} />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {filters}
              {hasStatus && (
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 rounded-lg border bg-background px-2 text-sm" aria-label={uiText("Filter by status")}>
                  <option value="">{uiText("All statuses")}</option>
                  <option value="published">{uiText("Published")}</option>
                  {showScheduledFilter && <option value="scheduled">{uiText("Scheduled")}</option>}
                  <option value="draft">{uiText("Draft")}</option>
                  <option value="archived">{uiText("Archived")}</option>
                </select>
              )}
            </div>
          </div>

          {canBulk && checked.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-b p-3">
              <span className="text-sm">{checked.length} selected</span>
              <select aria-label="Bulk status" className="h-9 rounded-lg border bg-background px-2 text-sm"
                value={batchStatus} onChange={event => setBatchStatus(event.target.value)} disabled={applying}>
                <option value="">Change status</option>
                <option value="published">Publish</option>
                <option value="draft">Move to draft</option>
                <option value="archived">Archive</option>
              </select>
              <Button variant="outline" size="sm" disabled={!batchStatus || applying} onClick={applyStatus}>Apply to selected</Button>
            </div>
          )}
          {list.isError ? (
            <div className="p-4">
              <ErrorState error={list.error} onRetry={list.refetch} />
            </div>
          ) : list.isPending ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-11" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title={emptyTitle || uiTemplate`No ${meta.plural.toLowerCase()} found`}
                description={q || status ? uiText("Try clearing the search or filters.") : undefined}
                action={
                  createPath && (
                    <Button asChild>
                      <Link to={createPath}>
                        <Plus /> {createLabel || uiTemplate`New ${meta.singular}`}
                      </Link>
                    </Button>
                  )
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {canBulk && <TableHead className="w-10">
                      <input type="checkbox" aria-label="Select all items on this page" checked={items.length === checked.length} disabled={applying}
                        onChange={event => setSelected(event.target.checked ? items.map(item => item._id) : [])} />
                    </TableHead>}
                    {columns.map((col) => (
                      <TableHead key={col.header} className={col.className}>
                        {col.header}
                      </TableHead>
                    ))}
                    {hasStatus && <TableHead>{uiText("Status")}</TableHead>}
                    <TableHead className="hidden md:table-cell">{uiText("Updated")}</TableHead>
                    <TableHead className="w-12">
                      <span className="sr-only">{uiText("Actions")}</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item._id} className="cursor-pointer" onClick={() => editPath && navigate(editPath(item))}>
                      {canBulk && <TableCell onClick={event => event.stopPropagation()}>
                        <input type="checkbox" aria-label={'Select ' + rowLabel(item)} checked={selected.includes(item._id)} disabled={applying}
                          onChange={event => setSelected(current => event.target.checked ? [...current, item._id] : current.filter(id => id !== item._id))} />
                      </TableCell>}
                      {columns.map((col) => (
                        <TableCell key={col.header} className={col.className}>
                          {col.cell(item)}
                        </TableCell>
                      ))}
                      {hasStatus && (
                        <TableCell>
                          <StatusBadge doc={item} />
                        </TableCell>
                      )}
                      <TableCell className="hidden text-xs text-muted-foreground md:table-cell">{timeAgo(item.updatedAt)}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label={uiTemplate`Actions for ${rowLabel(item)}`}>
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {editPath && (
                              <DropdownMenuItem onSelect={() => navigate(editPath(item))}>
                                <Pencil />{uiText("Edit")}</DropdownMenuItem>
                            )}
                            {canDuplicate && (
                              <DropdownMenuItem onSelect={() => duplicate.mutate(item._id)}>
                                <Copy />{uiText("Duplicate")}</DropdownMenuItem>
                            )}
                            {hasStatus && can('content:publish') && (
                              <>
                                {item.status !== 'published' ? (
                                  <DropdownMenuItem onSelect={() => changeStatus.mutate({ id: item._id, status: 'published' })}>
                                    <Send />{uiText("Publish")}</DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onSelect={() => changeStatus.mutate({ id: item._id, status: 'draft' })}>
                                    <Undo2 />{uiText("Unpublish")}</DropdownMenuItem>
                                )}
                              </>
                            )}
                            {item.isVisible !== undefined && (
                              <DropdownMenuItem disabled title={uiText("Open the item to change visibility")}>
                                {item.isVisible ? <Eye /> : <EyeOff />} {item.isVisible ? uiText("Visible") : uiText("Hidden")}
                              </DropdownMenuItem>
                            )}
                            {can('content:delete') && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onSelect={() => onDelete(item)}>
                                  <Trash2 />{uiText("Delete")}</DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {list.data?.pages > 1 && (
            <div className="flex items-center justify-between gap-3 border-t px-4 py-3 text-sm">
              <span className="text-muted-foreground">{list.data.total}{uiText("total")}</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>{uiText("Previous")}</Button>
                <span>
                  {page} / {list.data.pages}
                </span>
                <Button variant="outline" size="sm" disabled={page >= list.data.pages} onClick={() => setPage(page + 1)}>{uiText("Next")}</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
