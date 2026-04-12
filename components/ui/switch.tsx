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
        // 1. CHANGED: inline-flex is now flex, and p-[2px] is added
        'peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/30 focus-visible:border-ring focus-visible:ring-ring/50 relative flex p-[2px] h-[28px] w-[50px] shrink-0 cursor-pointer items-center rounded-full border border-border shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        // 2. CHANGED: Removed translate-x-[...], added ml-auto and ml-0
        className="bg-white pointer-events-none block size-[22px] rounded-full shadow-sm ring-0 transition-all data-[state=checked]:ml-auto data-[state=unchecked]:ml-0"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }