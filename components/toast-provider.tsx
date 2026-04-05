"use client";

/*
 * Global toast renderer with consistent dark styling for app notifications.
 */

import { Toaster } from "sonner";

// Mounts one toast portal instance at app root.
export function ToastProvider() {
  return (
    <Toaster
      theme="dark"
      richColors
      position="top-center"
      toastOptions={{
        className: "bg-slate-900 text-slate-100 border border-white/10",
      }}
    />
  );
}
