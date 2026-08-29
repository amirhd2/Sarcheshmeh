import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg', 'robots.txt'],
            manifest: {
                name: 'سرچشمه',
                short_name: 'سرچشمه',
                description: 'دفترچه‌ی درآمد شخصی — آفلاین‌اول، شمسی',
                dir: 'rtl',
                lang: 'fa',
                start_url: '/',
                display: 'standalone',
                orientation: 'portrait',
                background_color: '#F4F2EF',
                theme_color: '#3E7C6B',
                icons: [
                    {
                        src: '/icons/icon-192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any',
                    },
                    {
                        src: '/icons/icon-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any',
                    },
                    {
                        src: 'icons/maskable-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable',
                    },
                ],
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2}'],
                cleanupOutdatedCaches: true,
                clientsClaim: true,
            },
            devOptions: {
                enabled: false,
            },
        }),
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
            '@db': fileURLToPath(new URL('./src/db', import.meta.url)),
            '@lib': fileURLToPath(new URL('./src/lib', import.meta.url)),
            '@styles': fileURLToPath(new URL('./src/styles', import.meta.url)),
            '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
            '@features': fileURLToPath(new URL('./src/features', import.meta.url)),
        },
    },
    server: {
        host: true,
        port: 5173,
        // Restrict Vite's file system access to project sources only —
        // prevents accidental scanning of sibling directories (e.g. skills/).
        fs: {
            allow: [
                fileURLToPath(new URL('./src', import.meta.url)),
                fileURLToPath(new URL('./public', import.meta.url)),
                fileURLToPath(new URL('.', import.meta.url)),
            ],
            deny: [fileURLToPath(new URL('./skills', import.meta.url))],
        },
    },
    // Limit dep pre-bundling scanner to project entries only — without this,
    // Vite crawls all HTML files in the workspace and tries to resolve deps
    // from sibling packages (e.g. skills/ has demo HTML importing `three`).
    optimizeDeps: {
        entries: ['index.html', 'src/main.tsx'],
    },
});
