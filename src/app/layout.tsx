import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import { AppSettingsProvider } from '@/features/dashboard/AppSettingsContext';
import './globals.css';

// Self-hosted Vazirmatn font — works offline without Google Fonts CDN
const vazirmatn = localFont({
  src: [
    { path: '../../public/fonts/Vazirmatn-Light.woff2', weight: '300', style: 'normal' },
    { path: '../../public/fonts/Vazirmatn-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../../public/fonts/Vazirmatn-Medium.woff2', weight: '500', style: 'normal' },
    { path: '../../public/fonts/Vazirmatn-SemiBold.woff2', weight: '600', style: 'normal' },
    { path: '../../public/fonts/Vazirmatn-Bold.woff2', weight: '700', style: 'normal' },
    { path: '../../public/fonts/Vazirmatn-ExtraBold.woff2', weight: '800', style: 'normal' },
  ],
  variable: '--font-vazirmatn',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ثمر',
  description: 'دفترچه‌ی درآمد شخصی — آفلاین‌اول، شمسی',
  applicationName: 'ثمر',
  authors: [{ name: 'ثمر' }],
  keywords: ['درآمد', 'شمسی', 'جلالی', 'بودجه', 'finance'],
  icons: {
    icon: [
      { url: '/icons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/favicon.ico', sizes: 'any' },
    ],
    shortcut: '/icons/favicon.ico',
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '192x192',
        url: '/icons/android-chrome-192x192.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '512x512',
        url: '/icons/android-chrome-512x512.png',
      },
    ],
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ثمر',
  },
  // Explicit apple-mobile-web-app-capable meta tag — ensures iOS
  // treats this as a full-screen PWA with splash screen support.
  other: {
    'apple-mobile-web-app-capable': 'yes',
  },
  openGraph: {
    title: 'ثمر',
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

/* iOS splash screen links — must be in <head> as <link rel="apple-touch-startup-image">.
   We generate one per device size + color scheme. iOS picks the right one
   based on device + color scheme automatically. */
const splashScreens = [
  // iPhone 14 Pro Max
  { media: '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: light)', url: '/icons/splash-iphone-14-pro-max-light.png' },
  { media: '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: dark)', url: '/icons/splash-iphone-14-pro-max-dark.png' },
  // iPhone 14 Pro
  { media: '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: light)', url: '/icons/splash-iphone-14-pro-light.png' },
  { media: '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: dark)', url: '/icons/splash-iphone-14-pro-dark.png' },
  // iPhone 14
  { media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: light)', url: '/icons/splash-iphone-14-light.png' },
  { media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: dark)', url: '/icons/splash-iphone-14-dark.png' },
  // iPhone 13 mini
  { media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: light)', url: '/icons/splash-iphone-13-mini-light.png' },
  { media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: dark)', url: '/icons/splash-iphone-13-mini-dark.png' },
  // iPhone SE
  { media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (prefers-color-scheme: light)', url: '/icons/splash-iphone-se-light.png' },
  { media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (prefers-color-scheme: dark)', url: '/icons/splash-iphone-se-dark.png' },
  // iPad 12.9
  { media: '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (prefers-color-scheme: light)', url: '/icons/splash-ipad-12-9-light.png' },
  { media: '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (prefers-color-scheme: dark)', url: '/icons/splash-ipad-12-9-dark.png' },
  // iPad 11
  { media: '(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (prefers-color-scheme: light)', url: '/icons/splash-ipad-11-light.png' },
  { media: '(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (prefers-color-scheme: dark)', url: '/icons/splash-ipad-11-dark.png' },
  // iPad 10.2
  { media: '(device-width: 810px) and (device-height: 1080px) and (-webkit-device-pixel-ratio: 2) and (prefers-color-scheme: light)', url: '/icons/splash-ipad-10-2-light.png' },
  { media: '(device-width: 810px) and (device-height: 1080px) and (-webkit-device-pixel-ratio: 2) and (prefers-color-scheme: dark)', url: '/icons/splash-ipad-10-2-dark.png' },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" data-thamar suppressHydrationWarning>
      <head>
        {/* iOS splash screens — one <link> per device + color scheme */}
        {splashScreens.map((splash) => (
          <link
            key={splash.url}
            rel="apple-touch-startup-image"
            href={splash.url}
            media={splash.media}
          />
        ))}
        {/* Service Worker registration — enables full offline support and PWA caching */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(e) {
                    console.warn('SW registration info:', e);
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body className={`${vazirmatn.variable} antialiased`}>
        <AppSettingsProvider>
          {children}
          <Toaster />
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
