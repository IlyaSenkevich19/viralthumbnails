import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import { brandWordmark } from '@/config/site';
import { AuthProvider } from '@/contexts/auth-context';
import { QueryProvider } from '@/components/providers/query-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { ToastProvider } from '@/components/providers/toast-provider';
import { MarketingScripts } from '@/components/marketing/marketing-scripts';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: brandWordmark,
  description: 'ViralThumblify — AI thumbnails for YouTube.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={outfit.variable}>
      <body className="min-h-[100dvh] bg-background font-sans text-foreground antialiased">
        <MarketingScripts />
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
