import { Suspense } from 'react';
import { SessionLifecycle } from '@/components/navigation/session-lifecycle';
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GymOS V2",
  description: "A clear place to run your gym",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}<Suspense fallback={null}><SessionLifecycle /></Suspense></body>
    </html>
  );
}
