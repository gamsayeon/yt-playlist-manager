import type { VideoInfo } from "./types";
import { injectFixedCheckbox } from "./fixed-checkbox";

export function parseSearchVideoInfo(item: Element): VideoInfo | null {
  const thumbnailLink = item.querySelector("a#thumbnail") as HTMLAnchorElement | null;
  if (!thumbnailLink?.href) return null;

  const href = thumbnailLink.href;

  const shortsIdMatch = href.match(/\/shorts\/([^?&]+)/);
  if (shortsIdMatch) {
    const videoId = shortsIdMatch[1];
    const title = item.querySelector("#video-title")?.textContent?.trim() ?? "";
    const imgEl = item.querySelector("yt-image img") as HTMLImageElement | null;
    const thumbnail =
      imgEl?.src || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
    return { videoId, title, thumbnail };
  }

  const videoIdMatch = href.match(/[?&]v=([^&]+)/);
  if (videoIdMatch) {
    const videoId = videoIdMatch[1];
    const title = item.querySelector("#video-title")?.textContent?.trim() ?? "";
    const imgEl = item.querySelector("yt-image img") as HTMLImageElement | null;
    const thumbnail =
      imgEl?.src || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
    return { videoId, title, thumbnail };
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
  const thumbnail =
    imgEl?.src || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
  return { videoId, title, thumbnail };
}

export function injectSearchCheckbox(item: Element, videoInfo: VideoInfo): void {
  const anchor = item.querySelector("ytd-thumbnail") as HTMLElement | null;
  if (!anchor) return;
  injectFixedCheckbox(anchor, videoInfo);
}

export function injectSearchShortsCheckbox(item: Element, videoInfo: VideoInfo): void {
  injectFixedCheckbox(item as HTMLElement, videoInfo);
}