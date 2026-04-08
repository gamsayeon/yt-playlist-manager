// ✅ 검색 일반 영상 - 정상 동작
// ⚠️ 검색 쇼츠 - 미리보기 재생 시 사라짐 미해결

import type { VideoInfo } from "./types";
import { injectInto } from "./utils";

export function parseSearchVideoInfo(item: Element): VideoInfo | null {
  const thumbnailLink = item.querySelector("a#thumbnail") as HTMLAnchorElement | null;
  if (!thumbnailLink?.href) return null;

  const href = thumbnailLink.href;

  const shortsIdMatch = href.match(/\/shorts\/([^?&]+)/);
  if (shortsIdMatch) {
    const videoId = shortsIdMatch[1];
    const title = item.querySelector("#video-title")?.textContent?.trim() ?? "";
    const imgEl = item.querySelector("yt-image img") as HTMLImageElement | null;
    return {
      videoId,
      title,
      thumbnail: imgEl?.src ?? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
    };
  }

  const videoIdMatch = href.match(/[?&]v=([^&]+)/);
  if (videoIdMatch) {
    const videoId = videoIdMatch[1];
    const title = item.querySelector("#video-title")?.textContent?.trim() ?? "";
    const imgEl = item.querySelector("yt-image img") as HTMLImageElement | null;
    return {
      videoId,
      title,
      thumbnail: imgEl?.src ?? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
    };
  }

  return null;
}

export function parseSearchShortsInfo(item: Element): VideoInfo | null {
  const shortsLink = item.querySelector(
    "a.shortsLockupViewModelHostEndpoint[tabindex='-1']"
  ) as HTMLAnchorElement | null;
  if (!shortsLink?.href) return null;

  const shortsIdMatch = shortsLink.href.match(/\/shorts\/([^?&]+)/);
  if (!shortsIdMatch) return null;

  const videoId = shortsIdMatch[1];
  const title =
    item.querySelector("h3.shortsLockupViewModelHostMetadataTitle a span")
      ?.textContent?.trim() ?? "";
  const imgEl = item.querySelector("div.ytThumbnailViewModelImage img") as HTMLImageElement | null;
  return {
    videoId,
    title,
    thumbnail: imgEl?.src ?? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
  };
}

export function injectSearchCheckbox(item: Element, videoInfo: VideoInfo): void {
  const anchor = item.querySelector("ytd-thumbnail") as HTMLElement | null;
  if (!anchor) return;
  injectInto(anchor, videoInfo);
}

export function injectSearchShortsCheckbox(item: Element, videoInfo: VideoInfo): void {
  injectInto(item as HTMLElement, videoInfo);
}