# سرچشمه 🌊

> دفترچه‌ی درآمد شخصی — آفلاین‌اول، شمسی

اپلیکیشن وب پیشرفته (PWA) برای ثبت و مدیریت درآمدهای شخصی با تقویم شمسی، طراحی iOS-اول و پشتیبانی کامل آفلاین.

## ✨ ویژگی‌ها

- **تقویم شمسی (جلالی)** کامل — فصل‌ها، ماه‌ها، سال‌ها
- **آفلاین‌اول** — تمام داده‌ها در IndexedDB ذخیره می‌شن، بدون نیاز به اینترنت
- **PWA** — قابل نصب روی iOS/Android با اسپلش صفحه و آیکون
- **همگام‌سازی اختیاری با Google Drive** — بکاپ ابری و استفاده‌ی چنددستگاهی
- **تم روشن/تاریک** خودکار با تشخیص سیستم‌عامل
- **RTL کامل** — طراحی فارس و راست‌به‌چپ
- **فرم ثبت دو مرحله‌ای** با کیپد سفارشی و wheel picker شمسی
- **Swipe-to-delete** با انیمیشن و ژست برگشت از لبه (iOS-like)
- **مدیریت دسته/مقصد** با drag-to-reorder و انتخاب آیکون/رنگ
- **تکرار تراکنش** (ماهانه/سالانه)
- **نمودارها** — میله‌ای ۱۲ماه، دونات دسته/مقصد، مقایسه دو سال
- **قفل سال** برای جلوگیری از ویرایش سال‌های گذشته
- **خروجی PDF** برای گزارش‌های سالانه
- **Autocomplete توضیح** برای ورود سریع‌تر

## 🛠 استک فنی

- **Next.js 16** + React 19 + TypeScript
- **Tailwind CSS 4** (توکن‌های CSS برای تم روشن/تاریک)
- **Dexie.js** (IndexedDB wrapper)
- **Recharts** برای نمودارها
- **framer-motion** برای انیمیشن‌ها
- **jalali-plugin-dayjs** برای تقویم شمسی
- **dnd-kit** برای drag-to-reorder
- **Service Worker** برای پشتیبانی آفلاین
- **فونت self-hosted Vazirmatn** (بدون وابستگی به Google Fonts)
- **Google Identity Services** برای OAuth و Google Drive API برای سینک

## 🚀 شروع به کار

### پیش‌نیازها

- Node.js 18+ یا Bun
- npm/bun/yarn

### نصب

```bash
# clone
git clone https://github.com/amirhd2/Sarcheshmeh.git
cd Sarcheshmeh

# install dependencies
bun install  # یا npm install

# کپی فایل env مثال
cp .env.example .env

# اجرای dev server
bun run dev  # یا npm run dev
```

اپ روی http://localhost:3000 در دسترسه.

### ساخت نسخه production

```bash
bun run build
bun run start
```

## ☁️ فعال‌سازی همگام‌سازی با Google Drive (اختیاری)

بدون این، اپ فقط روی همون دستگاه کار می‌کنه. برای همگام‌سازی ابری:

1. به [Google Cloud Console](https://console.cloud.google.com) برو
2. یک پروژه بساز → **Google Drive API** رو Enable کن
3. **OAuth consent screen** رو تنظیم کن (External, شما به‌عنوان test user)
4. به **Credentials → Create Credentials → OAuth client ID** برو
5. نوع: **Web application**
6. در **Authorized JavaScript origins** این‌ها رو اضافه کن:
   - `http://localhost:3000`
   - `http://localhost:81`
   - (اگه deploy کردی، آدرس دامنه‌ت رو هم اضافه کن)
7. **Client ID** ساخته‌شده رو کپی کن
8. در فایل `.env`:
   ```
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
   ```
9. Rebuild کن

اپ فقط به `drive.appdata` scope دسترسی داره — یعنی فقط به **پوشه‌ی پنهان مخصوص اپ** در Google Drive شما، نه بقیه‌ی فایل‌ها. این از نظر حریم خصوصی امن‌ترین حالت ممکنه.

## 📁 ساختار پروژه

```
src/
├── app/                       # Next.js App Router
│   ├── layout.tsx             # Root layout + providers
│   └── page.tsx               # Dashboard اصلی
├── components/                # کامپوننت‌های UI
│   ├── season/                # صفحه فصل + SwipeRow
│   ├── settings/              # پنل تنظیمات
│   └── ...
├── features/
│   ├── auth/                  # Google Auth + Drive sync
│   ├── dashboard/             # Dashboard logic
│   ├── transaction-form/      # فرم ثبت ۲مرحله‌ای
│   ├── reports/               # نمودارها + PDF export
│   └── settings/              # Catalog CRUD + locked years
├── lib/                       # ابزارهای کمکی
│   ├── jalali.ts              # تقویم شمسی + faNum
│   ├── format.ts              # فرمت اعداد fa/en
│   └── google.ts              # GIS loader + token client
└── db/
    ├── schema.ts              # Dexie schema + domain types
    └── seed.ts                # داده‌های نمونه
```

## 📜 لایسنس

این پروژه شخصی است و فاقد لایسنس عمومی published شده. تمام حقوق محفوظ است.

## 👤 نویسنده

**Amir Sojoody** — [GitHub](https://github.com/amirhd2)
