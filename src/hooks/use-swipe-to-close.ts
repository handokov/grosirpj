'use client';

import { useEffect, useRef, useCallback } from 'react';

interface UseSwipeToCloseOptions {
  threshold?: number; // min px to swipe to close
  onClose: () => void;
  isOpen: boolean;
}

export function useSwipeToClose({ threshold = 80, onClose, isOpen }: UseSwipeToCloseOptions) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const startX = useRef(0);
  const currentX = useRef(0);
  const isDragging = useRef(false);

  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      panelRef.current = node;
    },
    []
  );

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const onTouchStart = (e: TouchEvent) => {
      startX.current = e.touches[0].clientX;
      currentX.current = startX.current;
      isDragging.current = true;
      panel.style.transition = 'none';
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging.current) return;
      currentX.current = e.touches[0].clientX;
      const diff = currentX.current - startX.current;
      // Only allow swiping to the right (closing)
      if (diff > 0) {
        panel.style.transform = `translateX(${diff}px)`;
        // Dim overlay proportionally
        const overlay = panel.previousElementSibling as HTMLElement;
        if (overlay) {
          const panelWidth = panel.offsetWidth;
          const progress = Math.min(diff / panelWidth, 1);
          overlay.style.opacity = String(1 - progress * 0.7);
        }
      }
    };

    const onTouchEnd = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      panel.style.transition = '';
      const overlay = panel.previousElementSibling as HTMLElement;
      if (overlay) overlay.style.opacity = '';
      const diff = currentX.current - startX.current;
      if (diff > threshold) {
        onClose();
      } else {
        // Snap back
        panel.style.transform = '';
        if (overlay) overlay.style.opacity = '';
      }
      // Reset after transition
      setTimeout(() => {
        if (isOpen) {
          panel.style.transform = '';
        }
      }, 350);
    };

    panel.addEventListener('touchstart', onTouchStart, { passive: true });
    panel.addEventListener('touchmove', onTouchMove, { passive: true });
    panel.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      panel.removeEventListener('touchstart', onTouchStart);
      panel.removeEventListener('touchmove', onTouchMove);
      panel.removeEventListener('touchend', onTouchEnd);
    };
  }, [isOpen, onClose, threshold]);

  return setRef;
}
