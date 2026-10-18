import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { KeyboardEvent } from 'react';
import CreateTradeDialogView from './CreateTradeDialogView';
import { createTradeFormSchema } from './types';
import type { CreateTradeFormValues, CreateTradeInput } from './types';

export type { CreateTradeInput } from './types';

type CreateTradeDialogProps = {
  open: boolean;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (input: CreateTradeInput) => void | Promise<unknown>;
};

export default function CreateTradeDialog({
  open,
  isPending,
  onClose,
  onSubmit,
}: CreateTradeDialogProps) {
  const [submitError, setSubmitError] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<CreateTradeFormValues, unknown, CreateTradeInput>({
    resolver: zodResolver(createTradeFormSchema),
    defaultValues: {
      symbol: '',
      side: undefined,
      trader: '',
      tradeTimestamp: '',
      status: undefined,
      book: '',
      counterparty: '',
    },
  });
  const pending = isPending || isSubmitting;

  useEffect(() => {
    if (open) {
      setFocus('symbol');
    } else {
      reset();
      setSubmitError(false);
    }
  }, [open, reset, setFocus]);

  if (!open) return null;

  const closeDialog = () => {
    if (!pending) onClose();
  };

  const submitTrade = handleSubmit(async (input) => {
    setSubmitError(false);
    try {
      await onSubmit(input);
      reset();
      onClose();
    } catch {
      setSubmitError(true);
    }
  });

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDialog();
      return;
    }

    if (event.key !== 'Tab') return;
    const focusable = event.currentTarget.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  return (
    <CreateTradeDialogView
      pending={pending}
      submitError={submitError}
      errors={errors}
      register={register}
      onClose={closeDialog}
      onSubmit={(event) => void submitTrade(event)}
      onKeyDown={handleDialogKeyDown}
    />
  );
}
