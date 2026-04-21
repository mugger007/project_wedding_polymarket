/*
 * Root app shell for global fonts, metadata, theme baseline, and toast provider mounting.
 */
import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ToastProvider } from "@/components/toast-provider";
import { LayoutClientWrapper } from "@/components/layout-client-wrapper";
import { getCurrentUser } from "@/lib/auth";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Eugene & Caiying Wedding Prediction Game",
  description: "Polymarket-style wedding prediction game powered by Next.js and Supabase.",
};

// Wraps every route with shared html/body styling and notification support.
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} comfort-mode h-full bg-[#f8faff] antialiased`}
    >
      <body className="min-h-full bg-[#f8faff] text-[#0a0a0a]">
        <LayoutClientWrapper userId={user?.id ?? null}>
          {children}
        </LayoutClientWrapper>
        <Analytics />
        <ToastProvider />
      </body>
    </html>
  );
}
