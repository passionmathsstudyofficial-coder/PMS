import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { errorMessage } from '@/lib/api';
import { useResourceMutations } from '../lib/resources.js';

export function StudyBatchImport({ resource, category, placement }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [message, setMessage] = useState('');
  const [failures, setFailures] = useState([]);
  const [busy, setBusy] = useState(false);
  const { save } = useResourceMutations(resource);
  const required = resource === 'important-questions'
    ? ['studyClass', 'questionCategory', 'questionSet']
    : category === 'formula_sheet' ? ['studyClass'] : ['studyClass', 'studyChapter'];

  const importDrafts = async () => {
    let rows;
    try {
      rows = JSON.parse(input);
      if (!Array.isArray(rows) || rows.length === 0 || rows.length > 100 ||
        rows.some(row => !row || typeof row !== 'object' || Array.isArray(row))) throw new Error();
    } catch {
      setMessage('Use a JSON array containing 1 to 100 records.');
      setFailures([]);
      return;
    }
    setBusy(true);
    setMessage('');
    const rejected = [];
    const errors = [];
    for (const [index, row] of rows.entries()) {
      const data = { ...placement, ...row, ...(category ? { category } : {}), status: 'draft', publishedAt: null };
      try {
        const missing = required.filter(key => !data[key]);
        if (missing.length) throw new Error('Required: ' + missing.join(', '));
        await save.mutateAsync({ data });
      } catch (error) {
        rejected.push(row);
        errors.push(`Record ${index + 1} — ${errorMessage(error)}`);
      }
    }
    setInput(rejected.length ? JSON.stringify(rejected, null, 2) : '');
    setMessage(`${rows.length - rejected.length} draft(s) created. ${rejected.length} failed.`);
    setFailures(errors);
    setBusy(false);
  };

  return <>
    <Button variant="outline" onClick={() => setOpen(true)}>Import drafts</Button>
    <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import drafts</DialogTitle>
          <DialogDescription>Upload or paste an array of records using the content API fields. Current class, chapter, category, and set filters supply defaults. Failed records stay in the editor for correction.</DialogDescription>
        </DialogHeader>
        <input type="file" accept=".json,application/json" aria-label="JSON file" disabled={busy}
          onChange={async event => {
            const file = event.target.files?.[0];
            if (file) setInput(await file.text());
            event.target.value = '';
          }} />
        <textarea aria-label="Draft records JSON" className="min-h-52 w-full rounded-md border bg-background p-3 font-mono text-sm"
          value={input} onChange={event => setInput(event.target.value)} disabled={busy} placeholder='[{"title":{"en":"Revision practice"}}]' />
        <p role="status" className="text-sm">{message}</p>
        {failures.length > 0 && <ul className="list-disc space-y-1 pl-5 text-sm text-destructive">
          {failures.map(error => <li key={error}>{error}</li>)}
        </ul>}
        <Button onClick={importDrafts} disabled={busy || !input.trim()}>{busy ? 'Importing…' : 'Create drafts'}</Button>
      </DialogContent>
    </Dialog>
  </>;
}
