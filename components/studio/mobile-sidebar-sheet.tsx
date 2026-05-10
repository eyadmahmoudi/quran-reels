'use client'

import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import * as SheetPrimitive from '@radix-ui/react-dialog'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { LeftSidebar } from './left-sidebar'
import { cn } from '@/lib/utils'

export function MobileSidebarSheet() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="فتح إعدادات الاستوديو"
          className={cn(
            'inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-border-subtle bg-surface text-ink-secondary transition-all duration-150 ease-out lg:hidden',
            'hover:border-border-default hover:bg-subtle',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-ring)]',
          )}
        >
          <SlidersHorizontal className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="h-[85vh] overflow-hidden p-0"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="relative flex h-full flex-col">
          {/* Drag handle */}
          <div className="flex shrink-0 items-center justify-center py-3" aria-hidden>
            <span className="h-1 w-10 rounded-full bg-border-default" />
          </div>
          <SheetPrimitive.Title className="sr-only">إعدادات الاستوديو</SheetPrimitive.Title>
          <SheetPrimitive.Description className="sr-only">
            إعدادات المصدر والقارئ والخلفية والترجمة والعرض والعلامة المائية
          </SheetPrimitive.Description>
          {/* Reuse the full sidebar content inside the sheet */}
          <div className="min-h-0 flex-1 overflow-hidden">
            <LeftSidebar />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
