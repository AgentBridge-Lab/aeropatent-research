'use client';

import { useEffect, type RefObject } from 'react';

/** Trap focus in an open overlay and restore the triggering control on close. */
export function useModalFocus(active: boolean, ref: RefObject<HTMLElement | null>, close: () => void) {
  useEffect(() => {
    const dialog = ref.current;
    if (!active || !dialog) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    const backgrounds = Array.from(document.querySelectorAll<HTMLElement>('[data-modal-background]'))
      .filter((el) => !el.contains(dialog));
    const oldInert = backgrounds.map((el) => el.inert);
    backgrounds.forEach((el) => { el.inert = true; });
    document.body.style.overflow = 'hidden';
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(
      'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])',
    )).filter((el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden');
    (focusable()[0] ?? dialog).focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key !== 'Tab') return;
      const items = focusable();
      const first = items[0], last = items[items.length - 1];
      if (!first) { event.preventDefault(); dialog.focus(); }
      else if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      backgrounds.forEach((el, i) => { el.inert = oldInert[i]; });
      if (previous?.isConnected) previous.focus();
    };
  }, [active, ref, close]);
}
