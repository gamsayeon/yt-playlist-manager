import type { VideoInfo } from "./types";
import {
  itemCheckboxMap,
  updateCheckboxPosition,
  removeAllFixedCheckboxes,
  getFixedContainer,
  createFixedCheckbox,
  registerFixedEvents,
  getHeaderBottom,
} from "./fixed-checkbox";

const clipObservers = new WeakMap<Element, MutationObserver>();
const itemObservers = new WeakMap<Element, MutationObserver>();

function keepClipPathNone(contents: HTMLElement): void {
  if (clipObservers.has(contents)) return;

  const obs = new MutationObserver(() => {
    if (contents.style.clipPath !== "none") {
      contents.style.clipPath = "none";
      contents.style.overflow = "visible";
    }
  });

  obs.observe(contents, { attributes: true, attributeFilter: ["style"] });
  clipObservers.set(contents, obs);

  contents.style.clipPath = "none";
  contents.style.overflow = "visible";
}

function watchItemContent(item: Element, cb: HTMLElement): void {
  if (itemObservers.has(item)) return;

  const obs = new MutationObserver(() => {
    const currentLink = item.querySelector(
      "a.shortsLockupViewModelHostEndpoint[tabindex='-1']"
    ) as HTMLAnchorElement | null;
    if (!currentLink) return;

    const match = currentLink.href.match(/\/shorts\/([^?&]+)/);
    if (!match) return;

    const currentVideoId = match[1];
    obs.disconnect();

    if (cb.dataset.videoId !== currentVideoId) {
      cb.remove();
      itemCheckboxMap.delete(item);
      itemObservers.delete(item);
      const videoInfo = parseHomeShortsInfo(item);
      if (videoInfo) {
        injectHomeShortsCheckbox(item, videoInfo);
      }
    } else {
      updateCheckboxPosition(item, cb, getHeaderBottom());
    }

    obs.observe(item, { childList: true, subtree: true });
  });

  obs.observe(item, { childList: true, subtree: true });
  itemObservers.set(item, obs);
}

export function parseHomeShortsInfo(item: Element): VideoInfo | null {
  const shortsLink = item.querySelector(
    "a.shortsLockupViewModelHostEndpoint[tabindex='-1']"
  ) as HTMLAnchorElement | null;
  if (!shortsLink) return null;

  const shortsIdMatch = shortsLink.href.match(/\/shorts\/([^?&]+)/);
  if (!shortsIdMatch) return null;

  const videoId = shortsIdMatch[1];
  const title =
    item
      .querySelector("h3.shortsLockupViewModelHostMetadataTitle a span")
      ?.textContent?.trim() ?? "";
  const imgEl = item.querySelector(
    "div.ytThumbnailViewModelImage img"
  ) as HTMLImageElement | null;

  // ✅ home-video.ts와 동일하게 fallback URL 즉시 사용
  const thumbnail =
    imgEl?.src || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;

  return { videoId, title, thumbnail };
}

export function injectHomeShortsCheckbox(
  item: Element,
  videoInfo: VideoInfo
): void {
  const contents = item.closest("#contents") as HTMLElement | null;
  if (contents) {
    keepClipPathNone(contents);
  }

  if (itemCheckboxMap.has(item)) {
    const existing = itemCheckboxMap.get(item)!;
    if (existing.dataset.videoId === videoInfo.videoId) {
      updateCheckboxPosition(item, existing, getHeaderBottom());
      return;
    }
    existing.remove();
    itemCheckboxMap.delete(item);
  }

  registerFixedEvents();

  const cb = createFixedCheckbox(videoInfo);
  getFixedContainer().appendChild(cb);
  itemCheckboxMap.set(item, cb);
  updateCheckboxPosition(item, cb, getHeaderBottom());

  watchItemContent(item, cb);
}

export function removeHomeShortsCheckboxes(): void {
  removeAllFixedCheckboxes();
}