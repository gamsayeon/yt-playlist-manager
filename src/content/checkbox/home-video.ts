// ✅ 홈피드 일반/회원전용 영상 - 정상 동작

import type { VideoInfo } from "./types";
import { injectInto } from "./utils";

export function parseHomeVideoInfo(item: Element): VideoInfo | null {
  const videoLink = item.querySelector(
    "a.yt-lockup-view-model__content-image"
  ) as HTMLAnchorElement | null;
  if (!videoLink) return null;

  const videoIdMatch = videoLink.href.match(/[?&]v=([^&]+)/);
  if (!videoIdMatch) return null;

  const videoId = videoIdMatch[1];
  const title =
    item.querySelector("h3.yt-lockup-metadata-view-model__heading-reset a span")
      ?.textContent?.trim() ?? "";
  const imgEl = item.querySelector("div.ytThumbnailViewModelImage img") as HTMLImageElement | null;
  return {
    videoId,
    title,
    thumbnail: imgEl?.src ?? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
  };
}

export function injectHomeVideoCheckbox(item: Element, videoInfo: VideoInfo): void {
  const anchor = item.querySelector(
    "a.yt-lockup-view-model__content-image"
  ) as HTMLElement | null;
  if (!anchor?.parentElement) return;
  injectInto(anchor.parentElement, videoInfo);
}