'use client';

/* =========================================================================
   سرچشمه — SettingsSheet (v2)
   =========================================================================
   PRD §6 page 5 (Settings) — accordion-style settings panel.
   User feedback:
   - Merge "پاک‌سازی داده‌ی نمونه" + "پاک‌سازی کامل" into one section
   - Custom confirm modal (not window.prompt — had ZWNJ issues)
   - Smooth accordion animations (height + opacity)
   - Fix isDemo query (use filter, not where.equals)
   ========================================================================= */

import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';
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
  AlertTriangle, Info, ChevronDown, ChevronRight, Database, AlertCircle,
  Lock, Unlock, User, Cloud, LogOut, RefreshCw,
} from 'lucide-react';
import { CatalogManagementView } from './CatalogManagementView';
import { useLockedYears } from '@/features/settings/useLockedYears';
import { useLiveQuery } from 'dexie-react-hooks';
import { useGoogleAuth } from '@/features/auth/GoogleAuthContext';
import { syncWithDrive } from '@/features/auth/driveSync';
import { jalaliYear, todayJalaliParts, faNum } from '@lib/jalali';

interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
  onOpenAuth?: () => void;
}

type AccordionSection =
  | 'appearance'
  | 'categories'
  | 'backup'
  | 'yearlock'
  | 'account'
  | 'danger'
  | 'about'
  | null;

export function SettingsSheet({ open, onClose, onOpenAuth }: SettingsSheetProps) {
  const { theme, digits, setTheme, setDigits } = useAppSettings();
  const [openSection, setOpenSection] = useState<AccordionSection>('appearance');
  const [demoCount, setDemoCount] = useState<number | null>(null);
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [wipeConfirmText, setWipeConfirmText] = useState('');
  const [showCatalogManagement, setShowCatalogManagement] = useState(false);
  const { lockedYears, toggleLock, isLocked } = useLockedYears();
  const { signedIn, signOut, configured } = useGoogleAuth();
  const [syncing, setSyncing] = useState(false);

  async function handleSync() {
    if (!signedIn) return;
    if (!configured) {
      toast.error('همگام‌سازی با گوگل فعال نیست — env variables ناقص‌اند.');
      return;
    }
    setSyncing(true);
    try {
      const result = await syncWithDrive();
      if (result.errors.length === 0) {
        toast.success(`همگام‌سازی شد — ${result.pushed} آیتم آپلود، ${result.pulled} آیتم دانلود`);
      } else {
        toast.error(`همگام‌سازی ناقص: ${result.errors.join('، ')}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا در همگام‌سازی');
    }
    setSyncing(false);
  }

  // Load years via useLiveQuery instead of manual async loading
  const availableYears = useLiveQuery(async () => {
    const txs = await db.transactions.filter((t) => !t.deletedAt).toArray();
    const yearSet = new Set<number>();
    for (const tx of txs) yearSet.add(jalaliYear(tx.date));
    if (yearSet.size === 0) yearSet.add(todayJalaliParts().jy);
    return [...yearSet].sort((a, b) => b - a);
  }, []) ?? [todayJalaliParts().jy];

  async function refreshDemoCount() {
    // Use filter (not where.equals) — boolean indexing is unreliable
    const count = await db.transactions.filter((t) => t.isDemo === true && !t.deletedAt).count();
    setDemoCount(count);
  }

  function toggleSection(section: AccordionSection) {
    if (section === 'backup' || section === 'danger') {
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
    e.target.value = '';
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
    // Use simple ASCII-ish check — normalize ZWNJ and whitespace
    const normalized = wipeConfirmText.replace(/[\u200c\u200d\s]/g, '').trim();
    if (normalized !== 'پاکسازی') {
      toast.error('تأیید نامعتبر — عبارت دقیقاً «پاک‌سازی» رو بنویس');
      return;
    }
    try {
      await wipeAll({ reseedSample: false });
      toast.success('همه‌چیز پاک شد');
      setShowWipeModal(false);
      setWipeConfirmText('');
      onClose();
    } catch {
      toast.error('خطا در پاک‌سازی');
    }
  }

  return (
    <>
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
              <div>
                <label className="text-sm font-medium text-text block mb-2">تم</label>
                <div className="flex gap-2">
                  <ThemeButton active={theme === 'system'} onClick={() => setTheme('system')} icon={<Monitor size={16} />} label="سیستم" />
                  <ThemeButton active={theme === 'light'} onClick={() => setTheme('light')} icon={<Sun size={16} />} label="روشن" />
                  <ThemeButton active={theme === 'dark'} onClick={() => setTheme('dark')} icon={<Moon size={16} />} label="تاریک" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-text block mb-2">اعداد</label>
                <div className="flex gap-2">
                  <ThemeButton active={digits === 'fa'} onClick={() => setDigits('fa')} label="فارسی ۱۲۳" />
                  <ThemeButton active={digits === 'en'} onClick={() => setDigits('en')} label="انگلیسی 123" />
                </div>
              </div>
            </div>
          </AccordionItem>

          {/* Categories & Destinations — opens full management view */}
          <AccordionItem
            icon={<Database size={18} />}
            title="دسته‌ها و مقصدها"
            isOpen={openSection === 'categories'}
            onToggle={() => toggleSection('categories')}
          >
            <div className="py-2">
              <button
                type="button"
                onClick={() => { onClose(); setShowCatalogManagement(true); }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-2xl pressable"
                style={{ background: 'rgb(var(--brand-primary) / 0.10)', color: 'rgb(var(--brand-primary))' }}
              >
                <span className="text-sm font-medium">مدیریت دسته‌ها و مقصدها</span>
                <ChevronRight size={18} strokeWidth={2.5} />
              </button>
            </div>
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

          {/* Year locking */}
          <AccordionItem
            icon={<Lock size={18} />}
            title="قفل سال"
            isOpen={openSection === 'yearlock'}
            onToggle={() => toggleSection('yearlock')}
          >
            <div className="py-2 space-y-2">
              <p className="text-xs text-text-muted leading-relaxed mb-2">
                با قفل کردن یه سال، تراکنش‌های اون سال قابل ویرایش یا حذف نیستن. برای جلوگیری از تغییرات اشتباهی در سال‌های گذشته.
              </p>
              {availableYears.map((y) => {
                const locked = isLocked(y);
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => toggleLock(y)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl pressable transition-colors"
                    style={{
                      background: locked ? 'rgb(var(--danger) / 0.08)' : 'rgb(var(--surface-2))',
                    }}
                  >
                    {locked ? (
                      <Lock size={16} style={{ color: 'rgb(var(--danger))' }} />
                    ) : (
                      <Unlock size={16} className="text-text-muted" />
                    )}
                    <span className="flex-1 text-sm text-text text-right nums digits-font">
                      {digits === 'fa' ? faNum(y) : y}
                    </span>
                    <span
                      className="text-xs font-medium"
                      style={{ color: locked ? 'rgb(var(--danger))' : 'rgb(var(--text-muted))' }}
                    >
                      {locked ? 'قفل‌شده' : 'باز'}
                    </span>
                  </button>
                );
              })}
            </div>
          </AccordionItem>

          {/* Danger zone — merged sample + full wipe */}
          <AccordionItem
            icon={<AlertTriangle size={18} />}
            title="پاک‌سازی داده‌ها"
            isOpen={openSection === 'danger'}
            onToggle={() => toggleSection('danger')}
            danger
          >
            <div className="py-2 space-y-4">
              {/* Sample data deletion */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Trash2 size={14} className="text-text-muted" />
                  <span className="text-sm font-medium text-text">حذف داده‌ی نمونه</span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  {demoCount !== null && demoCount > 0
                    ? `${demoCount} رکورد نمونه در دیتابیس هست. این عملیات فقط رکوردهای نمونه رو حذف می‌کنه و رکوردهای واقعی شما دست‌نخورده می‌مونن.`
                    : 'رکورد نمونه‌ای برای حذف وجود نداره.'}
                </p>
                {demoCount !== null && demoCount > 0 && (
                  <button
                    type="button"
                    onClick={handleDeleteSample}
                    className="w-full py-2.5 rounded-2xl text-sm font-medium pressable"
                    style={{ background: 'rgb(var(--danger) / 0.12)', color: 'rgb(var(--danger))' }}
                  >
                    حذف {demoCount} رکورد نمونه
                  </button>
                )}
              </div>

              {/* Divider */}
              <div className="h-px" style={{ background: 'rgb(var(--text) / 0.08)' }} />

              {/* Full wipe */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} style={{ color: 'rgb(var(--danger))' }} />
                  <span className="text-sm font-medium text-text">پاک‌سازی کامل</span>
                </div>
                <div className="p-3 rounded-2xl" style={{ background: 'rgb(var(--danger) / 0.08)' }}>
                  <p className="text-xs text-text-muted leading-relaxed">
                    ⚠️ این عملیات <strong className="text-text">همه</strong> تراکنش‌ها، دسته‌ها و مقصدها رو پاک می‌کنه. قابل بازگشت نیست مگر اینکه فایل پشتیبان داشته باشی.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowWipeModal(true); setWipeConfirmText(''); }}
                  className="w-full py-2.5 rounded-2xl text-sm font-bold pressable"
                  style={{ background: 'rgb(var(--danger))', color: 'white' }}
                >
                  پاک‌سازی کامل همه‌چیز
                </button>
              </div>
            </div>
          </AccordionItem>

          {/* Account & Sync */}
          <AccordionItem
            icon={<User size={18} />}
            title="حساب و همگام‌سازی"
            isOpen={openSection === 'account'}
            onToggle={() => toggleSection('account')}
          >
            <div className="py-2 space-y-3">
              {signedIn ? (
                <>
                  {/* Signed-in state */}
                  <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: 'rgb(var(--surface-2))' }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgb(var(--brand-primary) / 0.12)' }}>
                      <User size={18} style={{ color: 'rgb(var(--brand-primary))' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text">متصل به گوگل</p>
                      <p className="text-xs text-text-muted">همگام‌سازی با درایو فعال است</p>
                    </div>
                  </div>

                  {/* Sync button */}
                  <button
                    type="button"
                    onClick={handleSync}
                    disabled={syncing}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium pressable"
                    style={{ background: 'rgb(var(--brand-primary) / 0.10)', color: 'rgb(var(--brand-primary))' }}
                  >
                    <RefreshCw size={16} strokeWidth={2.5} className={syncing ? 'animate-spin' : ''} />
                    {syncing ? 'در حال همگام‌سازی...' : 'همگام‌سازی دستی'}
                  </button>

                  {/* Sign out */}
                  <button
                    type="button"
                    onClick={async () => { await signOut(); }}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium pressable"
                    style={{ background: 'rgb(var(--danger) / 0.10)', color: 'rgb(var(--danger))' }}
                  >
                    <LogOut size={16} strokeWidth={2.5} />
                    قطع اتصال گوگل
                  </button>

                  <p className="text-xs text-text-muted text-center leading-relaxed">
                    داده‌ها در Google Drive شما (پوشه‌ی پنهان اپ) ذخیره می‌شن. دکمه «همگام‌سازی دستی» برای همگام‌سازی فوری.
                  </p>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => { onClose(); onOpenAuth?.(); }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium pressable"
                  style={{ background: 'rgb(var(--brand-primary) / 0.10)', color: 'rgb(var(--brand-primary))' }}
                >
                  <User size={16} strokeWidth={2.5} />
                  ورود با گوگل
                </button>
              )}
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

      {/* Custom wipe confirm modal — NOT window.prompt (had ZWNJ issues) */}
      <AnimatePresence>
        {showWipeModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[70] flex items-center justify-center p-6"
              style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
              onClick={() => { setShowWipeModal(false); setWipeConfirmText(''); }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="card w-full max-w-xs overflow-hidden text-center"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-5">
                  <div className="flex justify-center mb-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgb(var(--danger) / 0.12)' }}>
                      <AlertCircle size={24} strokeWidth={2.5} style={{ color: 'rgb(var(--danger))' }} />
                    </div>
                  </div>
                  <h3 className="font-bold text-base text-text mb-1">پاک‌سازی کامل</h3>
                  <p className="text-xs text-text-muted mb-3">
                    برای تأیید، عبارت «پاک‌سازی» رو در کادر زیر بنویس:
                  </p>
                  <input
                    type="text"
                    value={wipeConfirmText}
                    onChange={(e) => setWipeConfirmText(e.target.value)}
                    placeholder="پاک‌سازی"
                    autoFocus
                    className="w-full px-4 py-2.5 rounded-xl text-center text-sm outline-none"
                    style={{
                      background: 'rgb(var(--surface-2))',
                      color: 'rgb(var(--text))',
                      border: '1px solid rgb(var(--danger) / 0.3)',
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleWipeAll(); }}
                  />
                </div>
                <div className="grid grid-cols-2 border-t" style={{ borderColor: 'rgb(var(--text) / 0.08)' }}>
                  <button
                    type="button"
                    onClick={() => { setShowWipeModal(false); setWipeConfirmText(''); }}
                    className="py-3 text-sm font-medium pressable"
                    style={{ color: 'rgb(var(--brand-primary))', borderLeft: '1px solid rgb(var(--text) / 0.08)' }}
                  >
                    انصراف
                  </button>
                  <button
                    type="button"
                    onClick={handleWipeAll}
                    className="py-3 text-sm font-bold pressable"
                    style={{ color: 'rgb(var(--danger))' }}
                  >
                    تأیید پاک‌سازی
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Catalog Management — full-screen view */}
      {showCatalogManagement && (
        <CatalogManagementView onBack={() => setShowCatalogManagement(false)} />
      )}
    </>
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
        <span className="flex-1 text-sm font-medium text-text">{title}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="inline-flex"
        >
          <ChevronDown size={18} className="text-text-muted" />
        </motion.span>
      </button>
      {/* Smooth height animation with AnimatePresence */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3" style={{ background: 'rgb(var(--surface))' }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
