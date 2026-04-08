// ❌ 채널 페이지 - 미구현

import type { VideoInfo } from "./types";
import { injectInto } from "./utils";

export function parseChannelVideoInfo(item: Element): VideoInfo | null {
  // ytd-grid-video-renderer 구조
  const thumbnailLink = item.querySelector(
    "ytd-thumbnail a#thumbnail"
  ) as HTMLAnchorElement | null;
  if (!thumbnailLink?.href) return null;

  const videoIdMatch = thumbnailLink.href.match(/[?&]v=([^&]+)/);
  if (!videoIdMatch) return null;

  const videoId = videoIdMatch[1];
  const title =
    item.querySelector("#video-title")?.textContent?.trim() ?? "";
  const imgEl = item.querySelector("yt-image img") as HTMLImageElement | null;
  return {
    videoId,
    title,
    thumbnail: imgEl?.src ?? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
  };
}

export function injectChannelCheckbox(item: Element, videoInfo: VideoInfo): void {
  const anchor = item.querySelector("ytd-thumbnail") as HTMLElement | null;
  if (!anchor) return;
  injectInto(anchor, videoInfo);
}