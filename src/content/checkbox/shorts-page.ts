import type { VideoInfo } from "./types";
import { createCheckbox } from "./utils";

export function parseShortsPageInfo(): VideoInfo | null {
  const shortsIdMatch = location.pathname.match(/\/shorts\/([^?&]+)/);
  if (!shortsIdMatch) return null;
  const videoId = shortsIdMatch[1];
  const title = document.title.replace(" #shorts", "").trim();
  return {
    videoId,
    title,
    thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
  };
}

export function injectShortsPageCheckbox(): void {
  const container = document.querySelector(
    "ytd-reel-video-renderer #short-video-container"
  ) as HTMLElement | null;
  if (!container) return;

  const videoInfo = parseShortsPageInfo();
  if (!videoInfo) return;

  const existing = container.querySelector("[data-ytpm-checkbox]") as HTMLElement | null;

  if (existing) {
    // 같은 영상이면 유지, 다른 영상이면 교체
    if (existing.dataset.videoId === videoInfo.videoId) return;
    existing.remove();
  }

  container.style.position = "relative";
  const cb = createCheckbox(videoInfo);
  container.appendChild(cb);
}