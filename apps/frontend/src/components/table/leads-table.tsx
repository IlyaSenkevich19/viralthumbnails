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
import { useScoreLead, useGenerateReplyLead } from '@/lib/queries';
import { Button } from '@/components/ui/button';
import {
  MessageSquare,
  RefreshCw,
  Download,
  Archive,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Inbox,
} from 'lucide-react';
import { ReplyModal } from './reply-modal';
import type { Lead } from '@/lib/types/lead';

const columnHelper = createColumnHelper<Lead>();

const columns = [
  columnHelper.accessor('score', {
    header: 'Relevance',
    cell: (info) => {
      const score = Number(info.getValue());
      const isHigh = score >= 80;
      return (
        <span
          className={`
            inline-flex items-center justify-center min-w-[3rem] rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums
            ${isHigh ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}
          `}
        >
          {score}/100
        </span>
      );
    },
  }),
  columnHelper.accessor('title', {
    header: 'Post',
    cell: (info) => (
      <div className="min-w-0 max-w-[420px]">
        <a
          href={info.row.original.post_url}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-start gap-1.5 text-sm font-medium text-slate-900 hover:text-orange-600 transition-colors"
        >
          <span className="line-clamp-2 text-left">{info.getValue()}</span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 mt-0.5 opacity-50 group-hover:opacity-100" />
        </a>
        <p className="text-xs text-slate-500 line-clamp-2 mt-1">
          {(info.row.original.content ?? '').slice(0, 140)}
          {(info.row.original.content ?? '').length > 140 ? '…' : ''}
        </p>
      </div>
    ),
  }),
  columnHelper.accessor('subreddit', {
    header: 'Subreddit',
    cell: (info) => (
      <span className="text-xs font-medium text-slate-600">r/{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('created_at', {
    header: 'Date',
    cell: (info) => {
      const v = info.getValue();
      if (!v) return <span className="text-slate-400">—</span>;
      const d = new Date(v);
      return (
        <span className="text-xs text-slate-500 whitespace-nowrap">
          {d.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: d.getFullYear() !== new Date().getFullYear() ? '2-digit' : undefined,
          })}
          <span className="text-slate-400 ml-0.5">
            {d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
          </span>
        </span>
      );
    },
  }),
  columnHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => <RowActions lead={row.original} />,
  }),
];

function RowActions({ lead }: { lead: Lead }) {
  const [reply, setReply] = useState<string | null>(null);
  const { mutateAsync: scoreLead, isPending: scoring } = useScoreLead();
  const { mutateAsync: generateReply, isPending: generating } = useGenerateReplyLead();
  const [archived, setArchived] = useState(false);
  const loading = scoring || generating;

  async function handleRescore() {
    await scoreLead(lead.id);
  }

  async function handleGenerateReply() {
    const { reply: r } = await generateReply(lead.id);
    setReply(r);
  }

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        <Button
          size="sm"
          variant="outline"
          onClick={handleGenerateReply}
          disabled={loading}
          title="Generate reply"
          className="h-8 rounded-lg border-slate-200 bg-white hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700 text-slate-700"
        >
          <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
          Reply
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleRescore}
          disabled={loading}
          title="Rescore"
          className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setArchived(true)}
          disabled={archived}
          title="Archive"
          className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
        >
          <Archive className="h-3.5 w-3.5" />
        </Button>
      </div>
      {reply != null && <ReplyModal reply={reply} onClose={() => setReply(null)} />}
    </>
  );
}

function toCsv(rows: Lead[]): string {
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

export function LeadsTable({ data }: { data: Lead[] }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'score', desc: true }]);
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  function handleExport() {
    const csv = toCsv(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="rounded-full bg-slate-100 p-4 mb-4">
            <Inbox className="h-8 w-8 text-slate-400" />
          </div>
          <p className="text-slate-700 font-medium">No leads yet</p>
          <p className="text-sm text-slate-500 mt-1 max-w-sm">
            Run &quot;Scan now&quot; from the dashboard to find high-intent Reddit posts for your campaigns.
          </p>
        </div>
      </div>
    );
  }

  const headerGroup = table.getHeaderGroups()[0];
  const rows = table.getRowModel().rows;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          className="rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 h-9"
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sortDir = header.column.getIsSorted();
                return (
                  <th
                    key={header.id}
                    className={`
                      px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider
                      ${header.id === 'actions' ? 'w-[1%] text-right' : ''}
                      ${canSort ? 'cursor-pointer select-none hover:text-slate-900' : ''}
                    `}
                    onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {canSort && (
                        <span className="text-slate-400">
                          {sortDir === 'asc' && <ChevronUp className="h-3.5 w-3.5" />}
                          {sortDir === 'desc' && <ChevronDown className="h-3.5 w-3.5" />}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80 transition-colors"
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={`
                      px-5 py-4 align-top
                      ${cell.column.id === 'actions' ? 'text-right' : ''}
                    `}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
