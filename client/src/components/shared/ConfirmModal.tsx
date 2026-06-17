import { useEffect, useRef } from 'react'

interface ConfirmModalProps {
  open: boolean
  title: string
  body: string
  primaryLabel: string
  secondaryLabel: string
  onPrimary: () => void
  onSecondary: () => void
  onClose: () => void
}

export function ConfirmModal({
  open,
  title,
  body,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
  onClose,
}: ConfirmModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const secondaryRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    // Capture the element that triggered the modal so we can restore focus on close.
    const previouslyFocused = document.activeElement as HTMLElement | null

    // First focus lands on the secondary (cancel) button per spec.
    const id = setTimeout(() => secondaryRef.current?.focus(), 0)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusable = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        )
        if (focusable.length === 0) return

        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      clearTimeout(id)
      document.removeEventListener('keydown', handleKeyDown)
      // Return focus to the element that opened the modal.
      previouslyFocused?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Card */}
      <div
        ref={modalRef}
        className="relative z-10 bg-white rounded-2xl shadow-xl w-full max-w-[480px] p-6 sm:p-8"
      >
        <h2
          id="confirm-modal-title"
          className="font-display text-xl font-bold text-navy mb-3"
        >
          {title}
        </h2>
        <p className="text-text-dark text-sm leading-relaxed mb-6">{body}</p>

        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <button
            ref={secondaryRef}
            type="button"
            onClick={onSecondary}
            className="px-5 py-2.5 rounded-lg border border-slate-300 text-text-dark font-medium text-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
          >
            {secondaryLabel}
          </button>
          <button
            type="button"
            onClick={onPrimary}
            className="px-5 py-2.5 rounded-lg bg-brand-blue text-white font-semibold text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 transition-colors"
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
