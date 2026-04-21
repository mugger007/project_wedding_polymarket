"use client";

/*
 * Global toast renderer with consistent dark styling for app notifications.
 */

import { Toaster } from "sonner";

// Mounts one toast portal instance at app root.
export function ToastProvider() {
  return (
    <Toaster
      theme="light"
      richColors
      position="top-center"
      toastOptions={{
        className: "bg-white text-[#0a0a0a] border-2 border-[#6c3bff] shadow-[0_8px_24px_rgba(108,59,255,0.25)]",
      }}
    />
  );
}
