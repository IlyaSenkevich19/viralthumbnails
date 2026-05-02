'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
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
import { Trash2, Upload, UserCircle } from 'lucide-react';
import { prepareAvatarImageFile } from '@/lib/prepare-avatar-image';
import { SetPageFrame } from '@/components/layout/set-page-frame';
import { EmptyState } from '@/components/ui/empty-state';
import { InlineLoadError } from '@/components/ui/inline-load-error';
import { Skeleton } from '@/components/ui/skeleton';

const AVATAR_ACCEPTED_FORMATS = 'PNG, JPG, WEBP';
const AVATAR_SIZE_HINT_MB = 10;

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

  const { data: items = [], isPending, isError, error, refetch } = useAvatarsList();
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
      toast.error(`Please upload an image (${AVATAR_ACCEPTED_FORMATS}).`);
      return;
    }
    if (file.size > AVATAR_SIZE_HINT_MB * 1024 * 1024) {
      toast.error(`Image is too large. Please upload up to ${AVATAR_SIZE_HINT_MB} MB.`);
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
      const message =
        err instanceof Error
          ? err.message
          : `Upload failed. Try ${AVATAR_ACCEPTED_FORMATS}, clear portrait, up to ${AVATAR_SIZE_HINT_MB} MB.`;
      toast.error(message);
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
          <p className="text-xs text-muted-foreground">
            Use a clear portrait photo. Accepted: {AVATAR_ACCEPTED_FORMATS}. Up to {AVATAR_SIZE_HINT_MB} MB.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
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

      {listError ? (
        <InlineLoadError
          message={listError}
          onRetry={hasSession ? () => void refetch() : undefined}
        />
      ) : null}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading faces">
          {[1, 2, 3].map((i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-border bg-card">
              <Skeleton className="aspect-square w-full rounded-none" />
              <div className="flex items-center justify-between gap-2 p-3">
                <Skeleton className="h-4 flex-1 rounded" />
                <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : hasSession && items.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              title="No saved faces yet"
              description={
                <>
                  Add a clear photo above — we&apos;ll use it as a reference when you generate thumbnails with your
                  face.
                </>
              }
              icon={<UserCircle className="h-7 w-7" strokeWidth={1.75} aria-hidden />}
            />
          </CardContent>
        </Card>
      ) : hasSession && items.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((a) => (
            <Card key={a.id} className="overflow-hidden">
              <div className="relative aspect-square bg-muted">
                {a.preview_url ? (
                  <Image
                    src={a.preview_url}
                    alt={`Face reference: ${a.name}`}
                    fill
                    sizes="(min-width: 1024px) 20rem, (min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                  />
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
