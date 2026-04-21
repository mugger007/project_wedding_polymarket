/*
 * Global loading state shown during route navigation and page transitions.
 */

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8faff] px-4 text-[#0a0a0a]">
      <div className="flex items-center gap-3 rounded-2xl border-2 border-[#d1d5db] bg-white px-4 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#d1d5db] border-t-[#6c3bff]" />
        <p className="text-sm font-semibold text-[#374151]">Loading...</p>
      </div>
    </main>
  );
}