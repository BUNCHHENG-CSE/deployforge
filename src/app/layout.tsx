import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TCT DeployForge — Intune One-Click App Deploy Platform',
  description:
    'TCT DeployForge — Automated enterprise Win32 application packaging, detection rule generation, and Graph API deployment platform for Microsoft Intune.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full bg-[#050811] text-slate-100 flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
