export default function AppLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-slate-700"
          aria-hidden
        />
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    </div>
  );
}
