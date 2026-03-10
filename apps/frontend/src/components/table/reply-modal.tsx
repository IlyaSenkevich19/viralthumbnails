'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Copy, X } from 'lucide-react';
import { useState } from 'react';

export function ReplyModal({ reply, onClose }: { reply: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(reply);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full max-h-[80vh] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between">
          <h3 className="font-semibold">AI Reply Draft</h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleCopy}>
              {copied ? 'Copied!' : <Copy className="h-4 w-4" />}
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          <p className="text-sm whitespace-pre-wrap">{reply}</p>
        </CardContent>
      </Card>
    </div>
  );
}
