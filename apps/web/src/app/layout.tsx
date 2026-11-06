import { Suspense } from 'react';
import { SessionLifecycle } from '@/components/navigation/session-lifecycle';
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { appearanceInitScript } from "@/lib/appearance";
import "./globals.css";
import "./platform.css";
import "./workspace.css";
import "./owner.css";
import "./trainer.css";
import "./member.css";
import "./common-foundation.css";

export const metadata: Metadata = {
  title: "GymOS V2",
  description: "A clear place to run your gym",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`h-full antialiased ${GeistSans.variable}`} suppressHydrationWarning>
      <head><script id="gymos-appearance" dangerouslySetInnerHTML={{ __html: appearanceInitScript }} /></head>
      <body className="min-h-full flex flex-col">{children}<Suspense fallback={null}><SessionLifecycle /></Suspense></body>
    </html>
  );
}
