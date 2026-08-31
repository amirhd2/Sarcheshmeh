'use client';

/* =========================================================================
   سرچشمه — SettingsSheet
   =========================================================================
   PRD §6 page 5 (Settings) — accordion-style settings panel:
   - 🎨 ظاهر → theme + digits + live preview
   - 🏷 دسته‌ها و مقصدها (Phase 2 — placeholder)
   - 💾 پشتیبان‌گیری → download JSON / restore / CSV
   - 🗑 پاک‌سازی داده‌ی نمونه
   - ⚠️ پاک‌سازی کامل (danger zone)
   - ℹ️ درباره → version + changelog
   ========================================================================= */

import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { BottomSheet } from '@/components/BottomSheet';
import { useAppSettings } from '@/features/dashboard/AppSettingsContext';
import {
  downloadBackup,
  restoreBackup,
  exportCSV,
  deleteSampleTransactions,
  wipeAll,
} from '@/features/settings/backup';
import { db } from '@/db/schema';
import {
  Sun, Moon, Monitor, Download, Upload, FileText, Trash2,
  AlertTriangle, Info, ChevronDown, Database,
} from 'lucide-react';

interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
}

type AccordionSection =
  | 'appearance'
  | 'categories'
  | 'backup'
  | 'sample'
  | 'danger'
  | 'about'
  | null;

export function SettingsSheet({ open, onClose }: SettingsSheetProps) {
  const { theme, digits, setTheme, setDigits } = useAppSettings();
  const [openSection, setOpenSection] = useState<AccordionSection>('appearance');
  const [demoCount, setDemoCount] = useState<number | null>(null);

  // Load demo count when backup section opens
  async function refreshDemoCount() {
    const count = await db.transactions.where('isDemo').equals(1).count();
    setDemoCount(count);
  }

  function toggleSection(section: AccordionSection) {
    if (section === 'backup' || section === 'sample') {
      refreshDemoCount();
    }
    setOpenSection((prev) => (prev === section ? null : section));
  }

  // --- Handlers ---
  async function handleDownloadBackup() {
    try {
      await downloadBackup();
      toast.success('فایل پشتیبان دانلود شد');
    } catch {
      toast.error('خطا در دانلود فایل پشتیبان');
    }
  }

  async function handleRestoreFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await restoreBackup(file, 'merge');
      toast.success('داده‌ها بازیابی شدند (ادغام)');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'خطا در بازیابی');
    }
    e.target.value = ''; // reset so same file can be re-selected
  }

  async function handleExportCSV() {
    try {
      await exportCSV();
      toast.success('فایل CSV دانلود شد');
    } catch {
      toast.error('خطا در خروجی CSV');
    }
  }

  async function handleDeleteSample() {
    try {
      const { count } = await deleteSampleTransactions();
      toast.success(`${count} رکورد نمونه حذف شد`);
      setDemoCount(0);
    } catch {
      toast.error('خطا در حذف داده‌ی نمونه');
    }
  }

  async function handleWipeAll() {
    const confirmed = window.prompt('برای تأیید پاک‌سازی کامل، عبارت «پاک‌سازی» رو تایپ کن:');
    if (confirmed !== 'پاک‌سازی') {
      toast.error('پاک‌سازی لغو شد');
      return;
    }
    try {
      await wipeAll({ reseedSample: false });
      toast.success('همه‌چیز پاک شد');
      onClose();
    } catch {
      toast.error('خطا در پاک‌سازی');
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="تنظیمات" showCloseButton>
      <div className="px-4 py-2 pb-8 space-y-2">
        {/* Appearance */}
        <AccordionItem
          icon={<Sun size={18} />}
          title="ظاهر"
          isOpen={openSection === 'appearance'}
          onToggle={() => toggleSection('appearance')}
        >
          <div className="space-y-4">
            {/* Theme */}
            <div>
              <label className="text-sm font-medium text-text block mb-2">تم</label>
              <div className="flex gap-2">
                <ThemeButton active={theme === 'system'} onClick={() => setTheme('system')} icon={<Monitor size={16} />} label="سیستم" />
                <ThemeButton active={theme === 'light'} onClick={() => setTheme('light')} icon={<Sun size={16} />} label="روشن" />
                <ThemeButton active={theme === 'dark'} onClick={() => setTheme('dark')} icon={<Moon size={16} />} label="تاریک" />
              </div>
            </div>
            {/* Digits */}
            <div>
              <label className="text-sm font-medium text-text block mb-2">اعداد</label>
              <div className="flex gap-2">
                <ThemeButton active={digits === 'fa'} onClick={() => setDigits('fa')} label="فارسی ۱۲۳" />
                <ThemeButton active={digits === 'en'} onClick={() => setDigits('en')} label="انگلیسی 123" />
              </div>
            </div>
          </div>
        </AccordionItem>

        {/* Categories & Destinations — Phase 2 placeholder */}
        <AccordionItem
          icon={<Database size={18} />}
          title="دسته‌ها و مقصدها"
          isOpen={openSection === 'categories'}
          onToggle={() => toggleSection('categories')}
        >
          <p className="text-sm text-text-muted py-2">
            مدیریت دسته‌ها و مقصدها در فاز ۲ اضافه می‌شه.
          </p>
        </AccordionItem>

        {/* Backup */}
        <AccordionItem
          icon={<Download size={18} />}
          title="پشتیبان‌گیری"
          isOpen={openSection === 'backup'}
          onToggle={() => toggleSection('backup')}
        >
          <div className="space-y-2 py-2">
            <SettingButton onClick={handleDownloadBackup} icon={<Download size={16} />} label="دانلود فایل پشتیبان (JSON)" />
            <label className="flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer pressable" style={{ background: 'rgb(var(--surface-2))' }}>
              <Upload size={16} className="text-text-muted" />
              <span className="text-sm text-text">بازیابی از فایل (ادغام)</span>
              <input type="file" accept=".json,application/json" onChange={handleRestoreFile} className="hidden" />
            </label>
            <SettingButton onClick={handleExportCSV} icon={<FileText size={16} />} label="خروجی CSV" />
          </div>
        </AccordionItem>

        {/* Delete sample data */}
        <AccordionItem
          icon={<Trash2 size={18} />}
          title="پاک‌سازی داده‌ی نمونه"
          isOpen={openSection === 'sample'}
          onToggle={() => toggleSection('sample')}
        >
          <div className="py-2 space-y-3">
            <p className="text-sm text-text-muted">
              {demoCount !== null && demoCount > 0
                ? `${demoCount} رکورد نمونه در دیتابیس هست. این عملیات فقط رکوردهای نمونه رو حذف می‌کنه و رکوردهای واقعی شما دست‌نخورده می‌مونن.`
                : 'رکورد نمونه‌ای برای حذف وجود نداره.'}
            </p>
            {demoCount !== null && demoCount > 0 && (
              <button
                type="button"
                onClick={handleDeleteSample}
                className="w-full py-3 rounded-2xl text-sm font-medium pressable"
                style={{ background: 'rgb(var(--danger) / 0.12)', color: 'rgb(var(--danger))' }}
              >
                حذف {demoCount} رکورد نمونه
              </button>
            )}
          </div>
        </AccordionItem>

        {/* Danger zone */}
        <AccordionItem
          icon={<AlertTriangle size={18} />}
          title="پاک‌سازی کامل"
          isOpen={openSection === 'danger'}
          onToggle={() => toggleSection('danger')}
          danger
        >
          <div className="py-2 space-y-3">
            <div className="p-3 rounded-2xl" style={{ background: 'rgb(var(--danger) / 0.08)' }}>
              <p className="text-sm text-text-muted">
                ⚠️ این عملیات <strong className="text-text">همه</strong> تراکنش‌ها، دسته‌ها و مقصدها رو پاک می‌کنه. این کار قابل بازگشت نیست مگر اینکه فایل پشتیبان داشته باشی.
              </p>
            </div>
            <button
              type="button"
              onClick={handleWipeAll}
              className="w-full py-3 rounded-2xl text-sm font-bold pressable"
              style={{ background: 'rgb(var(--danger))', color: 'white' }}
            >
              پاک‌سازی کامل همه‌چیز
            </button>
          </div>
        </AccordionItem>

        {/* About */}
        <AccordionItem
          icon={<Info size={18} />}
          title="درباره"
          isOpen={openSection === 'about'}
          onToggle={() => toggleSection('about')}
        >
          <div className="py-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-muted">نسخه</span>
              <span className="text-sm font-medium text-text">۰.۱.۰</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-muted">تقویم</span>
              <span className="text-sm font-medium text-text">شمسی (جلالی)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-muted">واحد</span>
              <span className="text-sm font-medium text-text">تومان</span>
            </div>
            <div className="pt-2 border-t" style={{ borderColor: 'rgb(var(--text) / 0.08)' }}>
              <p className="text-xs text-text-faint">سرچشمه — دفترچه‌ی درآمد شخصی، آفلاین‌اول</p>
            </div>
          </div>
        </AccordionItem>
      </div>
    </BottomSheet>
  );
}

/* ------------------------------------------------------------------------- */

function AccordionItem({
  icon,
  title,
  isOpen,
  onToggle,
  children,
  danger = false,
}: {
  icon: ReactNode;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgb(var(--surface-2))' }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-right pressable"
      >
        <span style={{ color: danger ? 'rgb(var(--danger))' : 'rgb(var(--text-muted))' }}>{icon}</span>
        <span className={`flex-1 text-sm font-medium ${danger ? 'text-text' : 'text-text'}`}>{title}</span>
        <ChevronDown
          size={18}
          className="text-text-muted transition-transform"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>
      {isOpen && (
        <div className="px-4 pb-3" style={{ background: 'rgb(var(--surface))' }}>
          {children}
        </div>
      )}
    </div>
  );
}

function ThemeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon?: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm pressable transition-colors"
      style={{
        background: active ? 'rgb(var(--brand-primary))' : 'rgb(var(--surface-2))',
        color: active ? 'white' : 'rgb(var(--text))',
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function SettingButton({
  onClick,
  icon,
  label,
}: {
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl pressable"
      style={{ background: 'rgb(var(--surface-2))' }}
    >
      <span className="text-text-muted">{icon}</span>
      <span className="text-sm text-text">{label}</span>
    </button>
  );
}
