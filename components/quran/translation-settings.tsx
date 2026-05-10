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
      <div className="flex items-center justify-between rounded-[10px] border border-border-subtle bg-surface px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-ink-primary" dir="rtl">عرض الترجمة</p>
          <p className="mt-0.5 text-[11px] text-ink-tertiary">Show translation — تحت الآية العربية</p>
        </div>
        <Switch
          id="translation-toggle"
          checked={config.showTranslation}
          onCheckedChange={handleToggle}
        />
      </div>

      {config.showTranslation && (
        <Select
          value={config.translationId?.toString() || ''}
          onValueChange={handleTranslationChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select translation">
              {selectedTranslation && (
                <span className="truncate">
                  {selectedTranslation.name}{' '}
                  <span className="text-ink-tertiary">({selectedTranslation.language})</span>
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {languages.map((lang) => {
              const translations = TRANSLATION_RESOURCES.filter((t) => t.language === lang)
              if (translations.length === 0) return null
              return (
                <SelectGroup key={lang}>
                  <SelectLabel className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-tertiary">
                    {lang}
                  </SelectLabel>
                  {translations.map((translation) => (
                    <SelectItem key={translation.id} value={translation.id.toString()}>
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
