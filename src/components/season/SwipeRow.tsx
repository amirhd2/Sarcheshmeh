'use client';

/* =========================================================================
   سرچشمه — SwipeRow
   =========================================================================
   PRD §7: swipe right→left = delete, swipe left→right = edit.
   ========================================================================= */

import { useEffect, useRef, useState } from 'react';
import { Trash2, Pencil, AlertCircle } from 'lucide-react';
import type { ReactNode } from 'react';

interface SwipeRowProps {
  children: ReactNode;
  onDelete?: () => void;
  onEdit?: () => void;
  disabled?: boolean;
}

const ACTION_BTN_WIDTH = 76;
const HALF_OPEN_THRESHOLD = 38;
const FULL_SWIPE_RATIO = 0.5;
const DIRECTION_SLOP = 6;

export function SwipeRow({ children, onDelete, onEdit, disabled = false }: SwipeRowProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const deleteBtnRef = useRef<HTMLDivElement>(null);
  const editBtnRef = useRef<HTMLDivElement>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const dragState = useRef({
    startX: 0, startY: 0, initialTranslate: 0, currentTranslate: 0,
    isDragging: false, directionLocked: false, isHorizontal: false,
    isOpen: false, openDirection: null as 'left' | 'right' | null,
    wrapperWidth: 0, rafId: 0, pendingTranslate: 0,
  });

  const resetToZero = () => {
    const card = cardRef.current;
    const delBtn = deleteBtnRef.current;
    const edBtn = editBtnRef.current;
    if (!card) return;
    card.classList.add('swipe-card-animating');
    if (delBtn) delBtn.classList.add('swipe-btn-animating');
    if (edBtn) edBtn.classList.add('swipe-btn-animating');
    card.style.transform = 'translate3d(0, 0, 0)';
    if (delBtn) { delBtn.style.width = '0px'; delBtn.style.opacity = '0'; }
    if (edBtn) { edBtn.style.width = '0px'; edBtn.style.opacity = '0'; }
    window.setTimeout(() => {
      card.classList.remove('swipe-card-animating');
      if (delBtn) delBtn.classList.remove('swipe-btn-animating');
      if (edBtn) edBtn.classList.remove('swipe-btn-animating');
    }, 360);
  };

  const closeSwipe = () => {
    const ds = dragState.current;
    ds.isOpen = false; ds.openDirection = null; ds.currentTranslate = 0;
    resetToZero();
  };

  useEffect(() => {
    if (disabled) return;
    const win = window as unknown as { __activeSwipeClose?: () => void };
    let activeClose: (() => void) | null = null;
    const registerActive = (closeFn: () => void) => {
      if (win.__activeSwipeClose) win.__activeSwipeClose();
      win.__activeSwipeClose = closeFn; activeClose = closeFn;
    };
    const unregisterActive = () => {
      if (win.__activeSwipeClose === activeClose) win.__activeSwipeClose = undefined;
      activeClose = null;
    };

    const wrapper = wrapperRef.current;
    const card = cardRef.current;
    if (!wrapper || !card) return;

    const getX = (e: TouchEvent | MouseEvent): number =>
      'touches' in e ? (e.touches[0]?.clientX ?? 0) : e.clientX;
    const getY = (e: TouchEvent | MouseEvent): number =>
      'touches' in e ? (e.touches[0]?.clientY ?? 0) : e.clientY;

    const updateUI = (translateX: number) => {
      const absX = Math.abs(translateX);
      card.style.transform = `translate3d(${translateX}px, 0, 0)`;
      const delBtn = deleteBtnRef.current;
      if (delBtn) {
        if (translateX < 0) { delBtn.style.opacity = '1'; delBtn.style.width = `${absX}px`; }
        else { delBtn.style.opacity = '0'; delBtn.style.width = '0px'; }
      }
      const edBtn = editBtnRef.current;
      if (edBtn) {
        if (translateX > 0) { edBtn.style.opacity = '1'; edBtn.style.width = `${absX}px`; }
        else { edBtn.style.opacity = '0'; edBtn.style.width = '0px'; }
      }
    };

    const scheduleUpdate = (translateX: number) => {
      const ds = dragState.current;
      ds.pendingTranslate = translateX;
      if (ds.rafId) return;
      ds.rafId = window.requestAnimationFrame(() => {
        ds.rafId = 0; updateUI(ds.pendingTranslate);
      });
    };

    const snapTo = (translateX: number, capButton: boolean) => {
      card.classList.add('swipe-card-animating');
      if (deleteBtnRef.current) deleteBtnRef.current.classList.add('swipe-btn-animating');
      if (editBtnRef.current) editBtnRef.current.classList.add('swipe-btn-animating');
      const absX = Math.abs(translateX);
      card.style.transform = `translate3d(${translateX}px, 0, 0)`;
      const btnWidth = capButton ? Math.min(absX, ACTION_BTN_WIDTH) : absX;
      const delBtn = deleteBtnRef.current;
      if (delBtn) {
        if (translateX < 0) { delBtn.style.opacity = '1'; delBtn.style.width = `${btnWidth}px`; }
        else { delBtn.style.opacity = '0'; delBtn.style.width = '0px'; }
      }
      const edBtn = editBtnRef.current;
      if (edBtn) {
        if (translateX > 0) { edBtn.style.opacity = '1'; edBtn.style.width = `${btnWidth}px`; }
        else { edBtn.style.opacity = '0'; edBtn.style.width = '0px'; }
      }
      window.setTimeout(() => {
        card.classList.remove('swipe-card-animating');
        if (deleteBtnRef.current) deleteBtnRef.current.classList.remove('swipe-btn-animating');
        if (editBtnRef.current) editBtnRef.current.classList.remove('swipe-btn-animating');
      }, 360);
    };

    const openSwipe = (direction: 'left' | 'right') => {
      const ds = dragState.current;
      ds.isOpen = true; ds.openDirection = direction;
      const target = direction === 'left' ? -ACTION_BTN_WIDTH : ACTION_BTN_WIDTH;
      ds.currentTranslate = target;
      registerActive(closeSwipe);
      snapTo(target, true);
    };

    const fullSwipeAnimate = (direction: 'left' | 'right') => {
      const ds = dragState.current;
      const offScreen = direction === 'left' ? -ds.wrapperWidth : ds.wrapperWidth;
      card.classList.add('swipe-card-animating');
      if (deleteBtnRef.current) deleteBtnRef.current.classList.add('swipe-btn-animating');
      if (editBtnRef.current) editBtnRef.current.classList.add('swipe-btn-animating');
      card.style.transform = `translate3d(${offScreen}px, 0, 0)`;
      const btnWidth = ds.wrapperWidth;
      if (direction === 'left' && deleteBtnRef.current) {
        deleteBtnRef.current.style.opacity = '1';
        deleteBtnRef.current.style.width = `${btnWidth}px`;
      }
      if (direction === 'right' && editBtnRef.current) {
        editBtnRef.current.style.opacity = '1';
        editBtnRef.current.style.width = `${btnWidth}px`;
      }
    };

    const onTouchStart = (e: TouchEvent | MouseEvent) => {
      const ds = dragState.current;
      ds.isDragging = true; ds.directionLocked = false; ds.isHorizontal = false;
      ds.startX = getX(e); ds.startY = getY(e);
      ds.wrapperWidth = wrapper.offsetWidth;
      // Read the card's ACTUAL current position from its transform style.
      // This is critical for two-step swipes: if the user released a
      // half-swipe and the card is mid-snap-animation, the actual
      // position might not match the "expected" open position yet.
      // Using the real position ensures the second swipe continues
      // smoothly from where the card actually IS, not from where it
      // was "supposed to" be. PRD user feedback: "کارت یه لحظه سرجای
      // خودش برمیگرده و بعد از اون به مسیرش ادامه میده".
      const currentTransform = card.style.transform || '';
      const match = currentTransform.match(/translate3d\((-?[\d.]+)px/);
      ds.initialTranslate = match ? parseFloat(match[1]) : 0;
      card.classList.remove('swipe-card-animating');
      if (deleteBtnRef.current) deleteBtnRef.current.classList.remove('swipe-btn-animating');
      if (editBtnRef.current) editBtnRef.current.classList.remove('swipe-btn-animating');
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', onTouchEnd);
      window.addEventListener('mousemove', onTouchMove);
      window.addEventListener('mouseup', onTouchEnd);
    };

    const onTouchMove = (e: TouchEvent | MouseEvent) => {
      const ds = dragState.current;
      if (!ds.isDragging) return;
      const x = getX(e); const y = getY(e);
      const deltaX = ds.startX - x; const deltaY = ds.startY - y;
      if (!ds.directionLocked) {
        if (Math.abs(deltaX) < DIRECTION_SLOP && Math.abs(deltaY) < DIRECTION_SLOP) return;
        ds.directionLocked = true;
        ds.isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
      }
      if (!ds.isHorizontal) return;
      if (e.cancelable) e.preventDefault();
      let calculatedX = ds.initialTranslate - deltaX;
      if (ds.initialTranslate < 0 && calculatedX > 0) calculatedX = calculatedX * 0.3;
      else if (ds.initialTranslate > 0 && calculatedX < 0) calculatedX = calculatedX * 0.3;
      ds.currentTranslate = calculatedX;
      scheduleUpdate(calculatedX);
    };

    const onTouchEnd = () => {
      const ds = dragState.current;
      if (!ds.isDragging) return;
      ds.isDragging = false;
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('mousemove', onTouchMove);
      window.removeEventListener('mouseup', onTouchEnd);
      if (!ds.directionLocked || !ds.isHorizontal) return;
      if (ds.rafId) { window.cancelAnimationFrame(ds.rafId); ds.rafId = 0; }
      updateUI(ds.currentTranslate);
      const absTranslate = Math.abs(ds.currentTranslate);
      const ratio = absTranslate / ds.wrapperWidth;
      if (ratio >= FULL_SWIPE_RATIO) {
        const direction = ds.currentTranslate < 0 ? 'left' : 'right';
        fullSwipeAnimate(direction);
        window.setTimeout(() => {
          if (direction === 'left') setShowConfirm(true);
          else onEdit?.();
          window.setTimeout(() => {
            ds.isOpen = false; ds.openDirection = null; ds.currentTranslate = 0;
            resetToZero();
          }, 100);
        }, 300);
        return;
      }
      if (absTranslate >= HALF_OPEN_THRESHOLD) {
        const direction = ds.currentTranslate < 0 ? 'left' : 'right';
        openSwipe(direction);
      } else { closeSwipe(); }
    };

    card.addEventListener('touchstart', onTouchStart, { passive: true });
    card.addEventListener('mousedown', onTouchStart);
    const deleteBtn = deleteBtnRef.current;
    const editBtn = editBtnRef.current;
    const deleteClick = (e: Event) => { e.stopPropagation(); setShowConfirm(true); };
    const editClick = (e: Event) => { e.stopPropagation(); onEdit?.(); };
    if (deleteBtn) deleteBtn.addEventListener('click', deleteClick);
    if (editBtn) editBtn.addEventListener('click', editClick);
    return () => {
      card.removeEventListener('touchstart', onTouchStart);
      card.removeEventListener('mousedown', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('mousemove', onTouchMove);
      window.removeEventListener('mouseup', onTouchEnd);
      if (deleteBtn) deleteBtn.removeEventListener('click', deleteClick);
      if (editBtn) editBtn.removeEventListener('click', editClick);
      unregisterActive();
    };
  }, [disabled, onDelete, onEdit]);

  useEffect(() => {
    const handleScroll = () => {
      const win = window as unknown as { __activeSwipeClose?: () => void };
      if (win.__activeSwipeClose) win.__activeSwipeClose();
    };
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    return () => window.removeEventListener('scroll', handleScroll, { capture: true } as EventListenerOptions);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const win = window as unknown as { __activeSwipeClose?: () => void };
      if (win.__activeSwipeClose && !wrapper.contains(target)) win.__activeSwipeClose();
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  return (
    <>
      <style>{`
        .swipe-card-animating { transition: transform 0.35s cubic-bezier(0.2, 0.9, 0.3, 1); }
        .swipe-btn-animating { transition: width 0.35s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.25s ease; }
      `}</style>
      <div ref={wrapperRef} className="relative w-full overflow-hidden">
        {onEdit && (
          <div ref={editBtnRef} className="absolute inset-y-0 left-0 flex items-center justify-center overflow-hidden"
            style={{ width: '0px', background: 'rgb(var(--success))', opacity: 0 }}>
            <div className="flex items-center justify-center shrink-0" style={{ width: `${ACTION_BTN_WIDTH}px` }}>
              <Pencil size={20} strokeWidth={2.5} className="text-white" />
            </div>
          </div>
        )}
        {onDelete && (
          <div ref={deleteBtnRef} className="absolute inset-y-0 right-0 flex items-center justify-center overflow-hidden"
            style={{ width: '0px', background: 'rgb(var(--danger))', opacity: 0 }}>
            <div className="flex items-center justify-center shrink-0" style={{ width: `${ACTION_BTN_WIDTH}px` }}>
              <Trash2 size={20} strokeWidth={2.5} className="text-white" />
            </div>
          </div>
        )}
        <div ref={cardRef} className="relative z-10 will-change-transform" style={{ touchAction: 'pan-y' }}>
          {children}
        </div>
      </div>
      {showConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6"
          style={{ background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowConfirm(false)}>
          <div className="card w-full max-w-xs overflow-hidden text-center" onClick={(e) => e.stopPropagation()}>
            <div className="p-5">
              <div className="flex justify-center mb-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgb(var(--danger) / 0.12)' }}>
                  <AlertCircle size={24} strokeWidth={2.5} style={{ color: 'rgb(var(--danger))' }} />
                </div>
              </div>
              <h3 className="font-bold text-base text-text mb-1">حذف تراکنش</h3>
              <p className="text-xs text-text-muted">آیا از حذف این تراکنش اطمینان داری؟</p>
            </div>
            <div className="grid grid-cols-2 border-t" style={{ borderColor: 'rgb(var(--text) / 0.08)' }}>
              <button type="button" onClick={() => setShowConfirm(false)}
                className="py-3 text-sm font-medium pressable"
                style={{ color: 'rgb(var(--brand-primary))', borderLeft: '1px solid rgb(var(--text) / 0.08)' }}>
                انصراف
              </button>
              <button type="button" onClick={() => { setShowConfirm(false); onDelete?.(); }}
                className="py-3 text-sm font-bold pressable" style={{ color: 'rgb(var(--danger))' }}>
                حذف شود
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
