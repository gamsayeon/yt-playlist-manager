import type { VideoInfo } from "./types";
import { injectInto } from "./utils";

export function parseChannelVideoInfo(item: Element): VideoInfo | null {
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
  const thumbnail =
    imgEl?.src || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
  return { videoId, title, thumbnail };
}

export function injectChannelCheckbox(item: Element, videoInfo: VideoInfo): void {
  const anchor = item.querySelector("ytd-thumbnail") as HTMLElement | null;
  if (!anchor) return;
  injectInto(anchor, videoInfo);
}