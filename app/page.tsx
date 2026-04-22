'use client'

import { ReelProvider } from '@/lib/reel-context'
import { GeneratorProvider } from '@/components/studio/generator-context'
import { TopBar } from '@/components/studio/top-bar'
import { LeftSidebar } from '@/components/studio/left-sidebar'
import { MainStage } from '@/components/studio/main-stage'

export default function QuranReelsStudio() {
  return (
    <ReelProvider>
      <GeneratorProvider>
        <div className="flex h-full min-h-0 flex-1 flex-col bg-zinc-950 text-zinc-100">
          <TopBar />
          <div className="flex min-h-0 flex-1">
            <LeftSidebar />
            <MainStage />
          </div>
        </div>
      </GeneratorProvider>
    </ReelProvider>
  )
}
