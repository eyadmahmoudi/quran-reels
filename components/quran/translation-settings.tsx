'use client'

import { useReel } from '@/lib/reel-context'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TRANSLATION_RESOURCES } from '@/lib/quran-types'

export function TranslationSettings() {
  const { config, setConfig } = useReel()

  const handleToggle = (checked: boolean) => {
    setConfig({ showTranslation: checked })
  }

  const handleTranslationChange = (value: string) => {
    setConfig({ translationId: parseInt(value) })
  }

  const selectedTranslation = TRANSLATION_RESOURCES.find(
    (t) => t.id === config.translationId
  )

  return (
    <div className="flex flex-col gap-4">
      <label className="text-sm font-medium text-muted-foreground">
        Translation / الترجمة
      </label>

      {/* Toggle */}
      <div className="flex items-center gap-3">
        <Switch
          id="translation-toggle"
          checked={config.showTranslation}
          onCheckedChange={handleToggle}
        />
        <Label htmlFor="translation-toggle" className="cursor-pointer">
          Show translation in video
        </Label>
      </div>

      {/* Language selector */}
      {config.showTranslation && (
        <Select
          value={config.translationId?.toString() || ''}
          onValueChange={handleTranslationChange}
        >
          <SelectTrigger className="h-10">
            <SelectValue placeholder="Select translation">
              {selectedTranslation && (
                <span>
                  {selectedTranslation.name} ({selectedTranslation.language})
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {/* Group by language */}
            {['English', 'Urdu', 'French', 'German', 'Italian', 'Indonesian'].map(
              (lang) => {
                const translations = TRANSLATION_RESOURCES.filter(
                  (t) => t.language === lang
                )
                if (translations.length === 0) return null
                return (
                  <div key={lang}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      {lang}
                    </div>
                    {translations.map((translation) => (
                      <SelectItem
                        key={translation.id}
                        value={translation.id.toString()}
                      >
                        {translation.name}
                      </SelectItem>
                    ))}
                  </div>
                )
              }
            )}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
