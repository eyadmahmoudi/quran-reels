'use client'

import { ReelProvider } from '@/lib/reel-context'
import { GeneratorProvider } from '@/components/studio/generator-context'
import { TopBar } from '@/components/studio/top-bar'
import { LeftSidebar } from '@/components/studio/left-sidebar'
import { MainStage } from '@/components/studio/main-stage'
import { MobileActionBar } from '@/components/studio/mobile-action-bar'

export default function QuranReelsStudio() {
  return (
    <ReelProvider>
      <GeneratorProvider>
        <div className="flex min-h-screen flex-1 flex-col bg-canvas text-ink-primary lg:h-full lg:min-h-0">
          <TopBar />
          <div className="flex flex-1 flex-col lg:min-h-0 lg:overflow-hidden lg:flex-row">
            <div className="enter-canvas min-h-0 flex-1 lg:order-2">
              <MainStage />
            </div>
            <div className="enter-sidebar hidden min-h-0 lg:order-1 lg:flex lg:flex-none">
              <LeftSidebar />
            </div>
          </div>
          <MobileActionBar />
        </div>
      </GeneratorProvider>
    </ReelProvider>
  )
}
