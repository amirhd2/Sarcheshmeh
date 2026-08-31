'use client';

/* =========================================================================
   سرچشمه — CatalogManagementView
   =========================================================================
   Full-screen view for managing categories and destinations.
   - Tabs: دسته‌ها / مقصدها
   - List with drag-to-reorder (dnd-kit)
   - Add / Edit / Delete (with transfer modal)
   ========================================================================= */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  DndContext, closestCenter, type DragEndEvent,
  TouchSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronRight, Plus, GripVertical, Pencil, Trash2, AlertCircle,
} from 'lucide-react';
import { db } from '@/db/schema';
import type { Category, Destination } from '@/db/schema';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  addCategory, updateCategory, deleteCategory, reorderCategories,
  addDestination, updateDestination, deleteDestination, reorderDestinations,
  getCategoryTransactionCount, getDestinationTransactionCount,
} from '@/features/settings/catalogOps';
import { CatalogForm, type CatalogFormData } from './CatalogForm';
import { IconRenderer } from '@/components/IconRenderer';
import { useAppSettings } from '@/features/dashboard/AppSettingsContext';

interface CatalogManagementViewProps {
  onBack: () => void;
}

type TabType = 'categories' | 'destinations';
type Mode = 'list' | 'add' | 'edit' | 'delete';

export function CatalogManagementView({ onBack }: CatalogManagementViewProps) {
  const { digits } = useAppSettings();
  const [tab, setTab] = useState<TabType>('categories');
  const [mode, setMode] = useState<Mode>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingItem, setDeletingItem] = useState<Category | Destination | null>(null);
  const [deleteCount, setDeleteCount] = useState(0);

  // Live query for categories and destinations
  const categories = useLiveQuery(async () => {
    const items = await db.categories.filter((c) => !c.deletedAt).toArray();
    return items.sort((a, b) => a.order - b.order);
  }, []) ?? [];

  const destinations = useLiveQuery(async () => {
    const items = await db.destinations.filter((d) => !d.deletedAt).toArray();
    return items.sort((a, b) => a.order - b.order);
  }, []) ?? [];

  const currentItems = tab === 'categories' ? categories : destinations;

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(TouchSensor, { activationConstraint: { distance: 8 } }),
  );

  function handleBack() {
    if (mode !== 'list') {
      setMode('list');
      setEditingId(null);
    } else {
      onBack();
    }
  }

  // --- Drag end handler ---
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = currentItems.map((item) => item.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(ids, oldIndex, newIndex);
    if (tab === 'categories') {
      reorderCategories(newOrder);
    } else {
      reorderDestinations(newOrder);
    }
  }

  // --- Add ---
  async function handleAdd(data: CatalogFormData) {
    try {
      if (tab === 'categories') {
        await addCategory(data);
      } else {
        await addDestination(data);
      }
      toast.success(`${tab === 'categories' ? 'دسته' : 'مقصد'} جدید اضافه شد`);
      setMode('list');
    } catch {
      toast.error('خطا در افزودن');
    }
  }

  // --- Edit ---
  async function handleEdit(data: CatalogFormData) {
    if (!editingId) return;
    try {
      if (tab === 'categories') {
        await updateCategory(editingId, data);
      } else {
        await updateDestination(editingId, data);
      }
      toast.success('تغییرات ذخیره شد');
      setMode('list');
      setEditingId(null);
    } catch {
      toast.error('خطا در ذخیره');
    }
  }

  // --- Delete (with transfer) ---
  async function handleDeleteClick(item: Category | Destination) {
    const count = tab === 'categories'
      ? await getCategoryTransactionCount(item.id)
      : await getDestinationTransactionCount(item.id);
    setDeleteCount(count);
    setDeletingItem(item);
    setMode('delete');
  }

  async function handleDeleteConfirm(transferToId?: string) {
    if (!deletingItem) return;
    try {
      if (tab === 'categories') {
        await deleteCategory(deletingItem.id, transferToId);
      } else {
        await deleteDestination(deletingItem.id, transferToId);
      }
      toast.success('حذف شد');
      setMode('list');
      setDeletingItem(null);
    } catch {
      toast.error('خطا در حذف');
    }
  }

  // --- Render ---
  if (mode === 'add') {
    return (
      <CatalogScreenWrapper title={tab === 'categories' ? 'دسته جدید' : 'مقصد جدید'} onBack={handleBack}>
        <CatalogForm type={tab === 'categories' ? 'category' : 'destination'} onSubmit={handleAdd} onCancel={() => setMode('list')} />
      </CatalogScreenWrapper>
    );
  }

  if (mode === 'edit' && editingId) {
    const item = currentItems.find((i) => i.id === editingId);
    if (item) {
      return (
        <CatalogScreenWrapper title="ویرایش" onBack={handleBack}>
          <CatalogForm
            type={tab === 'categories' ? 'category' : 'destination'}
            initialData={{ name: item.name, icon: item.icon, color: item.color }}
            onSubmit={handleEdit}
            onCancel={() => { setMode('list'); setEditingId(null); }}
          />
        </CatalogScreenWrapper>
      );
    }
  }

  if (mode === 'delete' && deletingItem) {
    return (
      <DeleteTransferScreen
        item={deletingItem}
        count={deleteCount}
        alternatives={currentItems.filter((i) => i.id !== deletingItem.id)}
        onConfirm={handleDeleteConfirm}
        onCancel={() => { setMode('list'); setDeletingItem(null); }}
        digits={digits}
      />
    );
  }

  // --- List mode ---
  return (
    <div
      className="season-view-enter fixed inset-0 z-40 overflow-y-auto no-scrollbar"
      style={{ background: 'rgb(var(--bg))', willChange: 'transform' }}
    >
      <style>{`
        @keyframes season-view-enter { from { transform: translate3d(100%, 0, 0); } to { transform: translate3d(0, 0, 0); } }
        .season-view-enter { animation: season-view-enter 0.35s cubic-bezier(0.22, 1, 0.36, 1); }
      `}</style>

      {/* Header */}
      <div className="sticky top-0 z-30 w-full" style={{ background: 'rgb(var(--bg))' }}>
        <header className="px-4 py-3 max-w-2xl md:max-w-4xl lg:max-w-5xl mx-auto w-full" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}>
          <div className="flex items-center gap-3">
            <button type="button" onClick={handleBack} aria-label="بازگشت"
              className="w-9 h-9 rounded-full flex items-center justify-center pressable shrink-0"
              style={{ background: 'rgb(var(--surface-2))', color: 'rgb(var(--text))' }}>
              <ChevronRight size={20} strokeWidth={2.5} />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-text">دسته‌ها و مقصدها</h1>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-3">
            <TabButton active={tab === 'categories'} onClick={() => setTab('categories')} label="دسته‌ها" count={categories.length} digits={digits} />
            <TabButton active={tab === 'destinations'} onClick={() => setTab('destinations')} label="مقصدها" count={destinations.length} digits={digits} />
          </div>
        </header>
      </div>

      {/* Content */}
      <div className="px-4 py-4 max-w-2xl mx-auto pb-24">
        {/* Add button */}
        <button
          type="button"
          onClick={() => setMode('add')}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium pressable mb-4"
          style={{ background: 'rgb(var(--brand-primary) / 0.10)', color: 'rgb(var(--brand-primary))' }}
        >
          <Plus size={18} strokeWidth={2.5} />
          افزودن {tab === 'categories' ? 'دسته' : 'مقصد'} جدید
        </button>

        {/* Sortable list */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={currentItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {currentItems.map((item) => (
                <SortableItem
                  key={item.id}
                  item={item}
                  onEdit={() => { setEditingId(item.id); setMode('edit'); }}
                  onDelete={() => handleDeleteClick(item)}
                  digits={digits}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {currentItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-text-muted">هنوز چیزی اضافه نشده</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------- */

function CatalogScreenWrapper({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <div className="season-view-enter fixed inset-0 z-40 overflow-y-auto no-scrollbar" style={{ background: 'rgb(var(--bg))' }}>
      <div className="sticky top-0 z-30 w-full" style={{ background: 'rgb(var(--bg))' }}>
        <header className="px-4 py-3 max-w-2xl mx-auto w-full" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onBack} aria-label="بازگشت"
              className="w-9 h-9 rounded-full flex items-center justify-center pressable shrink-0"
              style={{ background: 'rgb(var(--surface-2))', color: 'rgb(var(--text))' }}>
              <ChevronRight size={20} strokeWidth={2.5} />
            </button>
            <h1 className="text-lg font-bold text-text">{title}</h1>
          </div>
        </header>
      </div>
      <div className="max-w-2xl mx-auto pb-24">
        {children}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label, count, digits }: { active: boolean; onClick: () => void; label: string; count: number; digits: 'fa' | 'en' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-medium pressable transition-colors"
      style={{
        background: active ? 'rgb(var(--brand-primary))' : 'rgb(var(--surface-2))',
        color: active ? 'white' : 'rgb(var(--text))',
      }}
    >
      {label}
      <span className="nums digits-font text-xs px-1.5 py-0.5 rounded-full"
        style={{ background: active ? 'rgba(255,255,255,0.25)' : 'rgb(var(--text) / 0.08)' }}>
        {digits === 'fa' ? faNum(count) : count}
      </span>
    </button>
  );
}

function SortableItem({ item, onEdit, onDelete, digits }: {
  item: Category | Destination;
  onEdit: () => void;
  onDelete: () => void;
  digits: 'fa' | 'en';
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        opacity: isDragging ? 0.8 : 1,
      }}
      className="card flex items-center gap-3 p-3"
    >
      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="touch-none text-text-faint pressable shrink-0"
        aria-label="جابجایی"
      >
        <GripVertical size={20} />
      </button>

      {/* Icon + color */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
        style={{ background: `${item.color}20` }}
      >
        <IconRenderer name={item.icon} size={20} strokeWidth={2.5} color={item.color} />
      </div>

      {/* Name */}
      <span className="flex-1 text-sm font-medium text-text truncate">{item.name}</span>

      {/* Edit */}
      <button type="button" onClick={onEdit} className="w-8 h-8 rounded-full flex items-center justify-center pressable shrink-0"
        style={{ background: 'rgb(var(--surface-2))', color: 'rgb(var(--text-muted))' }}>
        <Pencil size={14} strokeWidth={2.5} />
      </button>

      {/* Delete */}
      <button type="button" onClick={onDelete} className="w-8 h-8 rounded-full flex items-center justify-center pressable shrink-0"
        style={{ background: 'rgb(var(--danger) / 0.10)', color: 'rgb(var(--danger))' }}>
        <Trash2 size={14} strokeWidth={2.5} />
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------
   Delete + Transfer screen
   ------------------------------------------------------------------------- */

function DeleteTransferScreen({ item, count, alternatives, onConfirm, onCancel, digits }: {
  item: Category | Destination;
  count: number;
  alternatives: ReadonlyArray<Category | Destination>;
  onConfirm: (transferToId?: string) => void;
  onCancel: () => void;
  digits: 'fa' | 'en';
}) {
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);

  return (
    <CatalogScreenWrapper title="حذف" onBack={onCancel}>
      <div className="px-5 py-4 space-y-4">
        {/* Item being deleted */}
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl" style={{ background: 'rgb(var(--danger) / 0.08)' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${item.color}25` }}>
              <IconRenderer name={item.icon} size={20} strokeWidth={2.5} color={item.color} />
            </div>
            <span className="text-sm font-medium text-text">{item.name}</span>
          </div>
        </div>

        {count > 0 ? (
          <>
            {/* Warning */}
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-2" style={{ background: 'rgb(var(--danger) / 0.12)' }}>
                <AlertCircle size={24} strokeWidth={2.5} style={{ color: 'rgb(var(--danger))' }} />
              </div>
              <p className="text-sm text-text-muted">
                این آیتم <strong className="text-text nums digits-font">{digits === 'fa' ? faNum(count) : count}</strong> تراکنش داره.
                قبل از حذف، مقصد انتقالشون رو انتخاب کن:
              </p>
            </div>

            {/* Transfer target list */}
            <div className="space-y-2">
              {alternatives.map((alt) => (
                <button
                  key={alt.id}
                  type="button"
                  onClick={() => setSelectedTransferId(alt.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl pressable transition-colors"
                  style={{
                    background: selectedTransferId === alt.id ? 'rgb(var(--brand-primary) / 0.08)' : 'rgb(var(--surface-2))',
                    border: selectedTransferId === alt.id ? '2px solid rgb(var(--brand-primary) / 0.3)' : '2px solid transparent',
                  }}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${alt.color}20` }}>
                    <IconRenderer name={alt.icon} size={16} strokeWidth={2.5} color={alt.color} />
                  </div>
                  <span className="flex-1 text-sm text-text text-right">{alt.name}</span>
                  {selectedTransferId === alt.id && (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgb(var(--brand-primary))' }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M1 6L4 9L11 2" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Confirm button */}
            <button
              type="button"
              disabled={!selectedTransferId}
              onClick={() => onConfirm(selectedTransferId ?? undefined)}
              className="w-full py-3 rounded-2xl text-sm font-bold pressable"
              style={{
                background: selectedTransferId ? 'rgb(var(--danger))' : 'rgb(var(--surface-2))',
                color: selectedTransferId ? 'white' : 'rgb(var(--text-faint))',
              }}
            >
              انتقال و حذف
            </button>
          </>
        ) : (
          <>
            {/* No transactions — direct delete */}
            <div className="flex flex-col items-center text-center">
              <p className="text-sm text-text-muted">این آیتم تراکنشی نداره. می‌تونی با خیال راحت حذفش کنی.</p>
            </div>
            <button
              type="button"
              onClick={() => onConfirm()}
              className="w-full py-3 rounded-2xl text-sm font-bold pressable"
              style={{ background: 'rgb(var(--danger))', color: 'white' }}
            >
              حذف
            </button>
          </>
        )}
      </div>
    </CatalogScreenWrapper>
  );
}

function faNum(n: number): string {
  return String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)] ?? d);
}
