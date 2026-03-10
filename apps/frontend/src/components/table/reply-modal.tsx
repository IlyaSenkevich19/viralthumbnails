'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Copy, X } from 'lucide-react';

export function ReplyModal({ reply, onClose }: { reply: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function handleCopy() {
    navigator.clipboard.writeText(reply);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return typeof document === 'undefined'
    ? null
    : createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reply-modal-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <Card
            className="max-w-2xl w-full max-h-[calc(100vh-3rem)] flex flex-col my-6 mx-4 shrink-0 rounded-2xl border border-slate-200/80 shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
        <CardHeader className="flex flex-row items-center justify-between">
          <h3 id="reply-modal-title" className="font-semibold">
            AI Reply Draft
          </h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleCopy}>
              {copied ? 'Copied!' : <Copy className="h-4 w-4" />}
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          <p className="text-sm whitespace-pre-wrap">{reply}</p>
        </CardContent>
      </Card>
    </div>,
    document.body,
  );
}
