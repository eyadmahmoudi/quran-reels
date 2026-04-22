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
        <div className="flex h-full min-h-0 flex-1 flex-col bg-background text-foreground">
          <TopBar />
          {/* Stack vertically on mobile, horizontal on desktop.
              MainStage is first in the DOM (so mobile users see the preview above the controls)
              but reordered to the right on desktop via `order` so the sidebar sits on the left. */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
            <div className="order-1 min-h-0 lg:order-2 lg:flex-1">
              <MainStage />
            </div>
            <div className="order-2 flex min-h-0 flex-1 lg:order-1 lg:flex-none">
              <LeftSidebar />
            </div>
          </div>
          <MobileActionBar />
        </div>
      </GeneratorProvider>
    </ReelProvider>
  )
}
