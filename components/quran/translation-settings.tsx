'use client'

import { useReel } from '@/lib/reel-context'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TRANSLATION_RESOURCES } from '@/lib/quran-types'

export function TranslationSettings() {
  const { config, setConfig } = useReel()

  const handleToggle = (checked: boolean) => setConfig({ showTranslation: checked })
  const handleTranslationChange = (value: string) => setConfig({ translationId: parseInt(value) })

  const selectedTranslation = TRANSLATION_RESOURCES.find(
    (t) => t.id === config.translationId,
  )

  const languages = ['English', 'Urdu', 'French', 'German', 'Italian', 'Indonesian', 'Turkish', 'Russian']

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950">
        <div>
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Show translation</p>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-500">Render under Arabic verse</p>
        </div>
        <Switch
          id="translation-toggle"
          checked={config.showTranslation}
          onCheckedChange={handleToggle}
          className="data-[state=checked]:bg-emerald-600"
        />
      </div>

      {config.showTranslation && (
        <Select
          value={config.translationId?.toString() || ''}
          onValueChange={handleTranslationChange}
        >
          <SelectTrigger className="h-10 w-full rounded-lg border-zinc-200 bg-white text-sm text-zinc-900 hover:bg-zinc-50 focus:ring-emerald-500/30 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900">
            <SelectValue placeholder="Select translation">
              {selectedTranslation && (
                <span className="truncate">
                  {selectedTranslation.name}{' '}
                  <span className="text-zinc-500 dark:text-zinc-500">({selectedTranslation.language})</span>
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="border-zinc-200 bg-white text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
            {languages.map((lang) => {
              const translations = TRANSLATION_RESOURCES.filter((t) => t.language === lang)
              if (translations.length === 0) return null
              return (
                <SelectGroup key={lang}>
                  <SelectLabel className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
                    {lang}
                  </SelectLabel>
                  {translations.map((translation) => (
                    <SelectItem
                      key={translation.id}
                      value={translation.id.toString()}
                      className="focus:bg-emerald-500/10 focus:text-emerald-700 dark:focus:text-emerald-300"
                    >
                      {translation.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )
            })}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
