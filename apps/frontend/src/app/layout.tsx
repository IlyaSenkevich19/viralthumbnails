import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { siteName } from '@/config/site';
import { AuthProvider } from '@/contexts/auth-context';
import { QueryProvider } from '@/components/providers/query-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { ToastProvider } from '@/components/providers/toast-provider';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: siteName,
  description: 'Next.js + Supabase + NestJS monorepo template',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`antialiased min-h-screen bg-background text-foreground ${inter.className}`}>
        <ThemeProvider>
          <AuthProvider>
            <QueryProvider>
              <ToastProvider />
              {children}
            </QueryProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
