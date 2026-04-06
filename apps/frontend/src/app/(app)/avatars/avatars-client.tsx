'use client';

import { useRef, useState } from 'react';
import {
  useAvatarsList,
  useCreateAvatarMutation,
  useDeleteAvatarMutation,
} from '@/lib/hooks';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { toast } from 'sonner';
import { Trash2, Upload } from 'lucide-react';
import { prepareAvatarImageFile } from '@/lib/prepare-avatar-image';
import { SetPageFrame } from '@/components/layout/set-page-frame';

function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result;
      if (typeof r !== 'string') {
        reject(new Error('Could not read file'));
        return;
      }
      resolve({ base64: r, mimeType: file.type || 'image/jpeg' });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function AvatarsClient() {
  const { user, accessToken, isLoading: authLoading } = useAuth();
  const hasSession = Boolean(user?.id && accessToken);
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: items = [], isPending, isError, error } = useAvatarsList();
  const createMutation = useCreateAvatarMutation();
  const deleteMutation = useDeleteAvatarMutation();

  const loading = authLoading || (hasSession && isPending);
  const listError =
    !authLoading && !hasSession
      ? 'Not signed in'
      : isError
        ? (error as Error).message
        : null;

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !hasSession) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Choose an image file');
      return;
    }
    setUploading(true);
    try {
      const prepared = await prepareAvatarImageFile(file);
      const { base64, mimeType } = await fileToBase64(prepared);
      await createMutation.mutateAsync({
        name: name.trim() || undefined,
        imageBase64: base64,
        mimeType,
      });
      setName('');
      toast.success('Face saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <SetPageFrame title="My faces" />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Add a face</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-2">
            <label htmlFor="avatar-name" className="text-xs font-medium text-muted-foreground">
              Label (optional)
            </label>
            <Input
              id="avatar-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Studio, Casual"
              disabled={!hasSession || uploading}
            />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={onPickFile}
          />
          <Button
            type="button"
            disabled={!hasSession || uploading}
            onClick={() => fileRef.current?.click()}
            className="shrink-0 gap-2"
          >
            <Upload className="h-4 w-4" />
            {uploading ? 'Uploading…' : 'Choose photo'}
          </Button>
        </CardContent>
      </Card>

      {listError && (
        <p className="text-sm text-destructive" role="alert">
          {listError}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading avatars…</p>
      ) : hasSession && items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No saved faces yet. Upload one above.</p>
      ) : hasSession && items.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((a) => (
            <Card key={a.id} className="overflow-hidden">
              <div className="relative aspect-square bg-muted">
                {a.preview_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.preview_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No preview</div>
                )}
              </div>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 pt-3">
                <CardTitle className="truncate text-sm font-semibold">{a.name}</CardTitle>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="shrink-0 text-destructive hover:bg-destructive/10"
                  aria-label={`Delete ${a.name}`}
                  onClick={() => setDeleteId(a.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : null}

      <ConfirmationModal
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete this face?"
        description="This removes the stored photo. Thumbnail flows that used it will need another avatar."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (!deleteId) return;
          const id = deleteId;
          setDeleteId(null);
          deleteMutation.mutate(id, {
            onSuccess: () => toast.success('Face removed'),
            onError: (err) => toast.error(err instanceof Error ? err.message : 'Delete failed'),
          });
        }}
      />
    </div>
  );
}
