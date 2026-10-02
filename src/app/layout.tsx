import type { Metadata } from "next";
// import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/layout/AuthProvider";
import AppLayoutShell from "@/components/layout/AppLayoutShell";
import PageTracker from "@/components/analytics/PageTracker";

// const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NizeStore - Anime & Manga Store (El Salvador)",
  description: "Ecommerce MVP para análisis de abandono de carritos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={"bg-slate-50/50 min-h-screen flex flex-col text-slate-900 antialiased"}>
        <AuthProvider>
          <PageTracker />
          <AppLayoutShell>
            {children}
          </AppLayoutShell>
        </AuthProvider>
      </body>
    </html>
  );
}
