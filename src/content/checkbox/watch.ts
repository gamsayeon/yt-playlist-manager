// ✅ /watch 추천 영상
// ✅ /watch 쇼츠

import type { VideoInfo } from "./types";
import { injectInto } from "./utils";

export function parseWatchVideoInfo(item: Element): VideoInfo | null {
  const videoLink = item.querySelector(
    "a.yt-lockup-view-model__content-image, a.ytLockupViewModelContentImage"
  ) as HTMLAnchorElement | null;
  if (!videoLink) return null;

  const videoIdMatch = videoLink.href.match(/[?&]v=([^&]+)/);
  if (!videoIdMatch) return null;

  const videoId = videoIdMatch[1];
  const title =
    item.querySelector(
      "h3.yt-lockup-metadata-view-model__heading-reset a span, h3.ytLockupMetadataViewModelHeadingReset a span"
    )?.textContent?.trim() ?? "";
  const imgEl = item.querySelector("div.ytThumbnailViewModelImage img") as HTMLImageElement | null;
  return {
    videoId,
    title,
    thumbnail: imgEl?.src ?? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
  };
}

export function injectWatchCheckbox(item: Element, videoInfo: VideoInfo): void {
  const anchor = item.querySelector(
    "a.yt-lockup-view-model__content-image, a.ytLockupViewModelContentImage"
  ) as HTMLElement | null;
  if (!anchor?.parentElement) return;
  injectInto(anchor.parentElement, videoInfo);
}

export function parseWatchShortsInfo(item: Element): VideoInfo | null {
  const shortsLink = item.querySelector(
    "a.shortsLockupViewModelHostEndpoint[tabindex='-1']"
  ) as HTMLAnchorElement | null;
  if (!shortsLink) return null;

  const shortsIdMatch = shortsLink.href.match(/\/shorts\/([^?&]+)/);
  if (!shortsIdMatch) return null;

  const videoId = shortsIdMatch[1];
  const title =
    item.querySelector("h3.shortsLockupViewModelHostMetadataTitle a span")
      ?.textContent?.trim() ?? "";
  const imgEl = item.querySelector(
    "div.ytThumbnailViewModelImage img"
  ) as HTMLImageElement | null;
  return {
    videoId,
    title,
    thumbnail: imgEl?.src ?? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
  };
}

export function injectWatchShortsCheckbox(item: Element, videoInfo: VideoInfo): void {
  const anchor = item.querySelector(
    "a.shortsLockupViewModelHostEndpoint[tabindex='-1']"
  ) as HTMLElement | null;
  if (!anchor) return;
  anchor.style.position = "relative";
  injectInto(anchor, videoInfo);
}