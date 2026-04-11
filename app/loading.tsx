/*
 * Global loading state shown during route navigation and page transitions.
 */

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 shadow-2xl">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-400 border-t-emerald-400" />
        <p className="text-sm font-medium">Loading...</p>
      </div>
    </main>
  );
}