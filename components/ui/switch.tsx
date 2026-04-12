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
        // We keep it relative so the absolute thumb stays contained
        'peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/30 focus-visible:border-ring focus-visible:ring-ring/50 relative inline-flex h-[28px] w-[50px] shrink-0 cursor-pointer items-center rounded-full border border-border shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        // 1. Added 'absolute'
        // 2. Changed to 'transition-all' so the 'left' property animates smoothly
        // 3. Using left-[calc(100%-24px)] ensures a perfect 2px gap on the right, no matter how wide the track is!
        className="bg-white pointer-events-none absolute block size-[22px] rounded-full shadow-sm ring-0 transition-all data-[state=checked]:left-[calc(100%-24px)] data-[state=unchecked]:left-[2px]"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }