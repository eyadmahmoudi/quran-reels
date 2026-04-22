'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const current = theme === 'system' ? resolvedTheme : theme
  const isDark = mounted ? current === 'dark' : true

  const toggle = () => setTheme(isDark ? 'light' : 'dark')

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'relative flex h-9 w-9 items-center justify-center rounded-lg border transition-colors',
        'border-zinc-200 bg-white text-zinc-600 hover:border-emerald-500/40 hover:text-emerald-600',
        'dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-emerald-500/40 dark:hover:text-emerald-400',
      )}
    >
      {/* Avoid hydration mismatch: render both icons, show the correct one via CSS once mounted */}
      <Sun
        className={cn(
          'h-4 w-4 transition-all',
          mounted && isDark ? 'scale-0 opacity-0' : 'scale-100 opacity-100',
          !mounted && 'scale-0 opacity-0',
        )}
        strokeWidth={2.25}
      />
      <Moon
        className={cn(
          'absolute h-4 w-4 transition-all',
          mounted && isDark ? 'scale-100 opacity-100' : 'scale-0 opacity-0',
          !mounted && 'scale-100 opacity-100',
        )}
        strokeWidth={2.25}
      />
    </button>
  )
}
