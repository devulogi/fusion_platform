import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import TradeRowActionsView from './TradeRowActionsView';

type TradeRowActionsProps = {
  tradeId: string;
  disabled?: boolean;
  defaultOpen?: boolean;
  onAmend: () => void;
  onCancel: () => void;
};

export default function TradeRowActions({
  tradeId,
  disabled = false,
  defaultOpen = false,
  onAmend,
  onCancel,
}: TradeRowActionsProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstActionRef = useRef<HTMLButtonElement>(null);
  const lastActionRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', closeOnOutsidePointer);
    firstActionRef.current?.focus();
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [isOpen]);

  const closeMenu = (event?: MouseEvent<HTMLButtonElement>) => {
    event?.stopPropagation();
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
      return;
    }

    if (event.key === 'ArrowDown' && document.activeElement === lastActionRef.current) {
      event.preventDefault();
      firstActionRef.current?.focus();
    } else if (event.key === 'ArrowUp' && document.activeElement === firstActionRef.current) {
      event.preventDefault();
      lastActionRef.current?.focus();
    }
  };

  const runAction = (action: () => void, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setIsOpen(false);
    triggerRef.current?.focus();
    action();
  };

  return (
    <TradeRowActionsView
      tradeId={tradeId}
      disabled={disabled}
      isOpen={isOpen}
      menuId={menuId}
      rootRef={rootRef}
      triggerRef={triggerRef}
      firstActionRef={firstActionRef}
      lastActionRef={lastActionRef}
      onToggle={() => setIsOpen((open) => !open)}
      onKeyDown={handleMenuKeyDown}
      onAmend={(event) => runAction(onAmend, event)}
      onCancel={(event) => runAction(onCancel, event)}
    />
  );
}
