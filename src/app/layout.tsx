import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRM Omnicanal Zernio",
  description: "Bandeja omnicanal con agentes de IA para WhatsApp, Instagram y Facebook",
};

import { Sidebar } from "@/components/sidebar";
import { Toaster } from "sonner";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full bg-slate-100">
      <body className="h-full antialiased font-sans flex flex-row overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {children}
        </div>
        <Toaster richColors position="top-right" closeButton />
      </body>
    </html>
  );
}
