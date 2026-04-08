// src/content/checkbox/home-shorts.ts

import type { VideoInfo } from "./types";

// WeakMap → Map으로 변경 (clear() 가능)
const itemCheckboxMap = new Map<Element, HTMLElement>();
const clipObservers = new WeakMap<Element, MutationObserver>();
const itemObservers = new WeakMap<Element, MutationObserver>();

let fixedContainer: HTMLElement | null = null;

function getFixedContainer(): HTMLElement {
  if (!fixedContainer) {
    fixedContainer = document.createElement("div");
    fixedContainer.setAttribute("data-ytpm-fixed-container", "true");
    fixedContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 0;
      height: 0;
      overflow: visible;
      z-index: 2147483647;
      pointer-events: none;
    `;
    document.body.appendChild(fixedContainer);
  }
  return fixedContainer;
}

function createFixedCheckbox(videoInfo: VideoInfo): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.setAttribute("data-ytpm-checkbox", "true");
  wrapper.dataset.videoId = videoInfo.videoId;
  wrapper.style.cssText = `
    position: fixed;
    width: 20px;
    height: 20px;
    cursor: pointer;
    isolation: isolate;
    pointer-events: auto;
    z-index: 2147483647;
  `;

  const input = document.createElement("input");
  input.type = "checkbox";
  input.style.cssText = `
    width: 100%;
    height: 100%;
    cursor: pointer;
    accent-color: #ff0000;
  `;

  input.addEventListener("click", (e) => e.stopPropagation());
  input.addEventListener("change", (e) => {
    e.stopPropagation();
    const messageType = input.checked ? "ADD_TO_TEMP_LIST" : "REMOVE_FROM_TEMP_LIST";
    chrome.runtime.sendMessage({ type: messageType, payload: videoInfo }, () => {
      if (chrome.runtime.lastError) {
        console.error("[YT Playlist Manager] sendMessage error", chrome.runtime.lastError);
      }
    });
    wrapper.dataset.checked = String(input.checked);
  });

  wrapper.appendChild(input);
  return wrapper;
}

function updateCheckboxPosition(item: Element, cb: HTMLElement): void {
  const rect = item.getBoundingClientRect();
  if (
    rect.width === 0 ||
    rect.height === 0 ||
    rect.bottom < 0 ||
    rect.top > window.innerHeight
  ) {
    cb.style.display = "none";
    return;
  }
  cb.style.display = "block";
  cb.style.top = rect.top + 8 + "px";
  cb.style.left = rect.left + 8 + "px";
}

function updateAllPositions(): void {
  itemCheckboxMap.forEach((cb, item) => {
    if (document.contains(item)) {
      updateCheckboxPosition(item, cb);
    } else {
      cb.remove();
      itemCheckboxMap.delete(item);
    }
  });
}

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

    if (cb.getAttribute("data-video-id") !== currentVideoId) {
      cb.remove();
      itemCheckboxMap.delete(item);
      itemObservers.delete(item);
      const videoInfo = parseHomeShortsInfo(item);
      if (videoInfo) {
        injectHomeShortsCheckbox(item, videoInfo);
      }
    } else {
      updateCheckboxPosition(item, cb);
    }

    obs.observe(item, { childList: true, subtree: true });
  });

  obs.observe(item, { childList: true, subtree: true });
  itemObservers.set(item, obs);
}

let eventsRegistered = false;

function registerEvents(): void {
  if (eventsRegistered) return;
  eventsRegistered = true;

  // capture: true로 YouTube 내부 스크롤도 캡처
  document.addEventListener("scroll", updateAllPositions, {
    passive: true,
    capture: true,
  });
  window.addEventListener("resize", updateAllPositions, { passive: true });

  // YouTube 내부 스크롤 컨테이너
  const ytApp = document.querySelector("ytd-app");
  if (ytApp) {
    ytApp.addEventListener("scroll", updateAllPositions, { passive: true });
  }
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
  return {
    videoId,
    title,
    thumbnail: imgEl?.src ?? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
  };
}

export function injectHomeShortsCheckbox(
  item: Element,
  videoInfo: VideoInfo
): void {
  if (itemCheckboxMap.has(item)) {
    const existing = itemCheckboxMap.get(item)!;
    updateCheckboxPosition(item, existing);
    return;
  }

  const contents = item.closest("#contents") as HTMLElement | null;
  if (contents) {
    keepClipPathNone(contents);
  }

  registerEvents();

  const cb = createFixedCheckbox(videoInfo);
  getFixedContainer().appendChild(cb);
  itemCheckboxMap.set(item, cb);

  updateCheckboxPosition(item, cb);
  watchItemContent(item, cb);
}

export function removeHomeShortsCheckboxes(): void {
  // 모든 체크박스 제거
  itemCheckboxMap.forEach((cb) => cb.remove());
  itemCheckboxMap.clear();

  fixedContainer?.remove();
  fixedContainer = null;
  eventsRegistered = false;

  document.removeEventListener("scroll", updateAllPositions, true);
  window.removeEventListener("resize", updateAllPositions);

  const ytApp = document.querySelector("ytd-app");
  if (ytApp) {
    ytApp.removeEventListener("scroll", updateAllPositions);
  }
}