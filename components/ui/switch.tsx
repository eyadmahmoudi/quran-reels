'use client'

import * as React from 'react'
import * as SwitchPrimitive from '@radix-ui/react-switch'

import { cn } from '@/lib/utils'

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-150 ease-out outline-none',
        'data-[state=checked]:bg-accent-primary data-[state=unchecked]:bg-muted-bg',
        'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--accent-ring)] focus-visible:ring-offset-canvas',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none absolute block size-4 rounded-full bg-white shadow-sm transition-all duration-150 ease-out data-[state=checked]:left-[calc(100%-18px)] data-[state=unchecked]:left-[2px]"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
