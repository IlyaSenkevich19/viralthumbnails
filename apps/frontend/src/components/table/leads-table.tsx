'use client';

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from '@tanstack/react-table';
import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { nestApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { MessageSquare, RefreshCw, Download } from 'lucide-react';
import { ReplyModal } from './reply-modal';

interface LeadRow {
  id: number;
  post_id: string;
  subreddit: string;
  username: string;
  title: string;
  score: number;
  post_url: string;
  content?: string;
}

const columnHelper = createColumnHelper<LeadRow>();

const columns = [
  columnHelper.accessor('score', {
    header: 'Score',
    cell: (info) => (
      <span className="font-mono font-medium text-primary">
        {Number(info.getValue()).toFixed(0)}
      </span>
    ),
  }),
  columnHelper.accessor('subreddit', {
    header: 'Subreddit',
    cell: (info) => (
      <span className="text-muted-foreground">r/{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('title', {
    header: 'Post',
    cell: (info) => (
      <a
        href={info.row.original.post_url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-foreground hover:text-primary hover:underline line-clamp-2 max-w-md"
      >
        {info.getValue()}
      </a>
    ),
  }),
  columnHelper.accessor('username', {
    header: 'Author',
    cell: (info) => info.getValue(),
  }),
  columnHelper.display({
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => <RowActions lead={row.original} />,
  }),
];

function RowActions({ lead }: { lead: LeadRow }) {
  const { accessToken } = useAuth();
  const [reply, setReply] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRescore() {
    if (!accessToken) return;
    setLoading(true);
    try {
      await nestApi.ai.scoreLead(accessToken, lead.id);
      window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateReply() {
    if (!accessToken) return;
    setLoading(true);
    try {
      const { reply } = await nestApi.ai.generateReplyLead(accessToken, lead.id);
      setReply(reply);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleGenerateReply}
          disabled={loading}
          title="Generate reply"
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleRescore}
          disabled={loading}
          title="Rescore"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      {reply && (
        <ReplyModal reply={reply} onClose={() => setReply(null)} />
      )}
    </>
  );
}

function toCsv(rows: LeadRow[]): string {
  const headers = ['Post ID', 'Subreddit', 'Username', 'Title', 'Score', 'URL', 'Created'];
  const escape = (v: unknown) =>
    `"${String(v ?? '').replace(/"/g, '""')}"`;
  const r = rows.map((l) => [
    l.post_id,
    l.subreddit,
    l.username,
    escape(l.title),
    l.score,
    l.post_url,
    (l as { created_at?: string }).created_at ?? '',
  ]);
  return [headers.join(','), ...r.map((row) => row.join(','))].join('\n');
}

export function LeadsTable({ data }: { data: unknown[] }) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'score', desc: true },
  ]);
  const rows = data as LeadRow[];

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  function handleExport() {
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>
      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border bg-muted/50">
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    className="px-4 py-3 text-left text-sm font-medium"
                  >
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-border hover:bg-muted/30 transition-colors"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 text-sm">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && (
        <p className="text-center text-muted-foreground py-12">
          No leads yet. Create a campaign and start monitoring.
        </p>
      )}
    </div>
  );
}
