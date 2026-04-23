import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex h-10 w-full min-w-0 rounded-[10px] border border-border-subtle bg-surface px-3 py-2 text-[14px] text-ink-primary shadow-none transition-all duration-150 ease-out outline-none',
        'placeholder:text-ink-tertiary',
        'hover:border-border-default',
        'focus-visible:border-accent-primary focus-visible:ring-2 focus-visible:ring-[color:var(--accent-ring)]',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60',
        'file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
