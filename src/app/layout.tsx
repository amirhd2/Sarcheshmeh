import type { Metadata, Viewport } from 'next';
import { Vazirmatn } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import { AppSettingsProvider } from '@/features/dashboard/AppSettingsContext';
import './globals.css';

const vazirmatn = Vazirmatn({
  subsets: ['arabic', 'latin'],
  variable: '--font-vazirmatn',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'سرچشمه',
  description: 'دفترچه‌ی درآمد شخصی — آفلاین‌اول، شمسی',
  applicationName: 'سرچشمه',
  authors: [{ name: 'سرچشمه' }],
  keywords: ['درآمد', 'شمسی', 'جلالی', 'بودجه', 'فinance'],
  icons: {
    icon: '/favicon.svg',
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'سرچشمه',
  },
  openGraph: {
    title: 'سرچشمه',
    description: 'دفترچه‌ی درآمد شخصی — آفلاین‌اول، شمسی',
    type: 'website',
    locale: 'fa_IR',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F4F2EF' },
    { media: '(prefers-color-scheme: dark)', color: '#141619' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" data-sarcheshmeh suppressHydrationWarning>
      <body className={`${vazirmatn.variable} antialiased`}>
        <AppSettingsProvider>
          {children}
          <Toaster />
          {/* Sonner toaster at bottom-center, ~5mm (19px) from bottom edge.
              PRD user feedback: toast should be near the bottom with a
              logical margin, not in the middle or top (status bar area). */}
          <SonnerToaster
            position="bottom-center"
            toastOptions={{
              style: {
                marginBottom: 'calc(19px + env(safe-area-inset-bottom, 0px))',
              },
            }}
          />
        </AppSettingsProvider>
      </body>
    </html>
  );
}
