'use client';

/* =========================================================================
   ثمر — NoteInput
   =========================================================================
   Text input with autocomplete dropdown for transaction notes.
   Suggestions come from the user's previous notes (most used first).
   ========================================================================= */

import { useState, useRef } from 'react';
import { useNoteSuggestions } from '@/features/transaction-form/useNoteSuggestions';

interface NoteInputProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}

export function NoteInput({ value, onChange, maxLength = 100 }: NoteInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestions = useNoteSuggestions(value);

  const showSuggestions = isFocused && suggestions.length > 0;

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      const selected = suggestions[highlightedIndex];
      if (selected) {
        onChange(selected);
        setIsFocused(false);
        setHighlightedIndex(-1);
      }
    } else if (e.key === 'Escape') {
      setIsFocused(false);
      setHighlightedIndex(-1);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value);
    setHighlightedIndex(-1);
  }

  function selectSuggestion(suggestion: string) {
    onChange(suggestion);
    setIsFocused(false);
    setHighlightedIndex(-1);
    inputRef.current?.blur();
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          // Delay to allow click on suggestion
          setTimeout(() => setIsFocused(false), 200);
        }}
        onKeyDown={handleKeyDown}
        placeholder="مثلاً: اضافه‌کاری فروردین"
        maxLength={maxLength}
        className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
        style={{
          background: 'rgb(var(--surface-2))',
          color: 'rgb(var(--text))',
        }}
      />

      {/* Autocomplete dropdown */}
      {showSuggestions && (
        <div
          className="absolute left-0 right-0 top-full mt-1 z-50 card overflow-hidden"
          style={{ maxHeight: '200px', overflowY: 'auto' }}
        >
          {suggestions.map((suggestion, i) => {
            const isActive = i === highlightedIndex;
            return (
              <button
                key={suggestion}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectSuggestion(suggestion);
                }}
                onMouseEnter={() => setHighlightedIndex(i)}
                className="w-full text-right px-4 py-2.5 text-sm pressable transition-colors"
                style={{
                  background: isActive ? 'rgb(var(--brand-primary) / 0.08)' : 'transparent',
                  color: 'rgb(var(--text))',
                }}
              >
                {suggestion}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
