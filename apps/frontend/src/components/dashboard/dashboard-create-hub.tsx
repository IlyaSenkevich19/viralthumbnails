'use client';

import { DASHBOARD_CREATE_HUB_MODE } from './dashboard-create-hub.utils';
import { useDashboardCreateHub } from './create-hub/use-dashboard-create-hub';
import { CreateHubHeader } from './create-hub/create-hub-header';
import { CreateHubModeTabs } from './create-hub/create-hub-mode-tabs';
import { CreateHubRecoveringBanner } from './create-hub/create-hub-recovering-banner';
import { PromptModePanel } from './create-hub/prompt-mode-panel';
import { YoutubeModePanel } from './create-hub/youtube-mode-panel';
import { VideoModePanel } from './create-hub/video-mode-panel';
import { VideoResultGrid } from './create-hub/video-result-grid';
import { CreateHubFooter } from './create-hub/create-hub-footer';

export function DashboardCreateHub() {
  const h = useDashboardCreateHub();

  return (
    <section className="surface-dashboard p-4 sm:p-5" aria-labelledby="dashboard-create-heading">
      <CreateHubHeader />
      <div className="mt-3">
        <CreateHubModeTabs mode={h.mode} onModeChange={h.onModeChange} />
      </div>
      <div className="mt-3 min-h-7">
        <CreateHubRecoveringBanner show={h.recoveringPreviousGeneration} />
      </div>

      <div className="mt-3 min-h-[8.5rem]">
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
            videoFile={h.videoFile}
            onVideoFileChange={h.setVideoFile}
          />
        )}
      </div>

      {h.mode === DASHBOARD_CREATE_HUB_MODE.video && h.videoResult && h.videoResult.thumbnails.length > 0 ? (
        <VideoResultGrid result={h.videoResult} />
      ) : null}

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
