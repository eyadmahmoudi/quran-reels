import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-[14px] font-medium shrink-0",
    "transition-all duration-150 ease-out",
    "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    "outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--accent-ring)] focus-visible:ring-offset-canvas",
    "aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
  ].join(' '),
  {
    variants: {
      variant: {
        default:
          'bg-accent-primary text-white shadow-sm hover:-translate-y-[1px] hover:bg-accent-hover hover:shadow-md active:translate-y-0 active:shadow-sm',
        destructive:
          'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20',
        outline:
          'border border-border-subtle bg-surface text-ink-secondary hover:border-border-default hover:bg-subtle',
        secondary:
          'bg-subtle text-ink-secondary hover:bg-muted-bg',
        ghost:
          'text-ink-secondary hover:bg-subtle hover:text-ink-primary',
        link:
          'text-accent-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-5 has-[>svg]:px-4',
        sm: 'h-9 rounded-[8px] gap-1.5 px-3 text-[13px] has-[>svg]:px-2.5',
        lg: 'h-11 rounded-[12px] px-6 has-[>svg]:px-5',
        icon: 'size-10',
        'icon-sm': 'size-8 rounded-[8px]',
        'icon-lg': 'size-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
