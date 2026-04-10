// src/content/checkbox/channel.ts

import type { VideoInfo } from "./types";
import { injectInto } from "./utils";

export function parseChannelVideoInfo(item: Element): VideoInfo | null {
  // 채널 탭은 ytd-rich-grid-media 사용
  const thumbnailLink = item.querySelector(
    "ytd-thumbnail a#thumbnail"
  ) as HTMLAnchorElement | null;
  if (!thumbnailLink?.href) return null;

  const videoIdMatch = thumbnailLink.href.match(/[?&]v=([^&]+)/);
  if (!videoIdMatch) return null;

  const videoId = videoIdMatch[1];
  const title =
    item.querySelector("#video-title, #title")?.textContent?.trim() ?? "";
  const imgEl = item.querySelector(
    "ytd-thumbnail img, yt-image img"
  ) as HTMLImageElement | null;
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