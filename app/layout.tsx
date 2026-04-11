/*
 * Root app shell for global fonts, metadata, theme baseline, and toast provider mounting.
 */
import type { Metadata } from "next";
import { Space_Grotesk, Sora } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ToastProvider } from "@/components/toast-provider";
import { LayoutClientWrapper } from "@/components/layout-client-wrapper";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Eugene & Caiying Wedding Prediction Game",
  description: "Polymarket-style wedding prediction game powered by Next.js and Supabase.",
};

// Wraps every route with shared html/body styling and notification support.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${sora.variable} comfort-mode h-full bg-slate-950 antialiased`}
    >
      <body className="min-h-full bg-slate-950 text-slate-100">
        <LayoutClientWrapper>
          {children}
        </LayoutClientWrapper>
        <Analytics />
        <ToastProvider />
      </body>
    </html>
  );
}
