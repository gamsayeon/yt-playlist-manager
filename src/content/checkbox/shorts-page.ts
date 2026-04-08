import type { VideoInfo } from "./types";
import { injectInto } from "./utils";

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

  container.querySelector("[data-ytpm-checkbox]")?.remove();

  const videoInfo = parseShortsPageInfo();
  if (!videoInfo) return;

  injectInto(container, videoInfo);
}