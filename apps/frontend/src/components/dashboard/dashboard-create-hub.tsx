'use client';

import { DASHBOARD_CREATE_HUB_MODE } from './dashboard-create-hub.utils';
import { useDashboardCreateHub } from './create-hub/use-dashboard-create-hub';
import { CreateHubHeader } from './create-hub/create-hub-header';
import { CreateHubModeTabs } from './create-hub/create-hub-mode-tabs';
import { CreateHubRecoveringBanner } from './create-hub/create-hub-recovering-banner';
import { PromptModePanel } from './create-hub/prompt-mode-panel';
import { YoutubeModePanel } from './create-hub/youtube-mode-panel';
import { VideoModePanel } from './create-hub/video-mode-panel';
import { MoreOptionsSection } from './create-hub/more-options-section';
import { PlannedStylesPreview } from './create-hub/planned-styles-preview';
import { VideoResultGrid } from './create-hub/video-result-grid';
import { CreateHubFooter } from './create-hub/create-hub-footer';

export function DashboardCreateHub() {
  const h = useDashboardCreateHub();

  return (
    <section className="surface-dashboard p-6 sm:p-8" aria-labelledby="dashboard-create-heading">
      <CreateHubHeader />
      <CreateHubModeTabs mode={h.mode} onModeChange={h.onModeChange} />
      <CreateHubRecoveringBanner show={h.recoveringPreviousGeneration} />

      <div className="mt-4">
        {h.mode === DASHBOARD_CREATE_HUB_MODE.prompt && (
          <PromptModePanel
            creative={h.creative}
            onCreativeChange={h.onPromptInput}
            describeError={h.describeError}
          />
        )}
        {h.mode === DASHBOARD_CREATE_HUB_MODE.youtube && (
          <YoutubeModePanel
            youtubeUrl={h.youtubeUrl}
            onYoutubeUrlChange={h.onYoutubeInput}
            onBlurEnrich={h.onYoutubeBlurEnrich}
            accessToken={h.accessToken}
            urlError={h.urlError}
            youtubeMetaPreview={h.youtubeMetaPreview}
          />
        )}
        {h.mode === DASHBOARD_CREATE_HUB_MODE.video && (
          <VideoModePanel
            onVideoFileChange={h.setVideoFile}
            videoRemoteUrl={h.videoRemoteUrl}
            onVideoRemoteUrlChange={h.setVideoRemoteUrl}
          />
        )}
      </div>

      {h.mode !== DASHBOARD_CREATE_HUB_MODE.video ? (
        <MoreOptionsSection
          moreOptionsOpen={h.moreOptionsOpen}
          onMoreOptionsToggle={h.setMoreOptionsOpen}
          assetsBusy={h.assetsBusy}
          canLoadAssets={h.canLoadAssets}
          templates={h.templates}
          avatars={h.avatars}
          selectedTemplateId={h.selectedTemplateId}
          onTemplateIdChange={h.setSelectedTemplateId}
          selectedAvatarId={h.selectedAvatarId}
          onAvatarIdChange={h.setSelectedAvatarId}
        />
      ) : null}

      {h.mode === DASHBOARD_CREATE_HUB_MODE.video && h.videoResult && h.videoResult.thumbnails.length > 0 ? (
        <VideoResultGrid result={h.videoResult} />
      ) : null}

      <PlannedStylesPreview plannedStyleCount={h.plannedStyleCount} plannedStyles={h.plannedStyles} />

      <CreateHubFooter
        canLoadAssets={h.canLoadAssets}
        onGenerate={() => void h.handleGenerate()}
        primaryBusy={h.primaryBusy}
        videoPreparing={h.videoPreparing}
        mode={h.mode}
        cannotAffordGenerate={h.cannotAffordGenerate}
      />
    </section>
  );
}
