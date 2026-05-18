import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Header from "./_components/Header";
import AuthDebugPanel from "./_components/AuthDebugPanel";
import RoleRouteGuard from "./_components/RoleRouteGuard";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Clarity",
  description: "Consulting marketplace and inquiry workflow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#e7f0ff_0%,_transparent_40%),radial-gradient(circle_at_top_left,_#ede9fe_0%,_transparent_40%)] text-slate-900">
          <Header />
          <main className="w-full px-4 py-8 md:px-6">
            <RoleRouteGuard>{children}</RoleRouteGuard>
          </main>
          <AuthDebugPanel />
        </div>
      </body>
    </html>
  );
}
