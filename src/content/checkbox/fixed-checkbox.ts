// src/content/checkbox/fixed-checkbox.ts

import type { VideoInfo } from "./types";

export const itemCheckboxMap = new Map<Element, HTMLElement>();

let fixedContainer: HTMLElement | null = null;
let eventsRegistered = false;
let rafScheduled = false;

export function getFixedContainer(): HTMLElement {
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

export function createFixedCheckbox(videoInfo: VideoInfo): HTMLElement {
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

function getHeaderBottom(): number {
  const header = document.querySelector(
    "ytd-masthead, #masthead-container"
  ) as HTMLElement | null;
  return header?.getBoundingClientRect().bottom ?? 56;
}

export function updateCheckboxPosition(
  item: Element,
  cb: HTMLElement,
  headerBottom: number
): void {
  const rect = item.getBoundingClientRect();

  if (
    rect.width === 0 ||
    rect.height === 0 ||
    rect.bottom < headerBottom ||
    rect.top > window.innerHeight
  ) {
    cb.style.display = "none";
    return;
  }

  const top = Math.max(rect.top + 8, headerBottom + 4);
  if (top > rect.bottom - 12) {
    cb.style.display = "none";
    return;
  }

  cb.style.display = "block";
  cb.style.top = top + "px";
  cb.style.left = rect.left + 8 + "px";
}

export function updateAllPositions(): void {
  // requestAnimationFrame으로 스크롤 이벤트 배치 처리
  // getBoundingClientRect 호출을 프레임당 한 번으로 제한
  if (rafScheduled) return;
  rafScheduled = true;

  requestAnimationFrame(() => {
    rafScheduled = false;
    // 루프 시작 시 헤더 높이 한 번만 계산
    const headerBottom = getHeaderBottom();

    itemCheckboxMap.forEach((cb, item) => {
      if (document.contains(item)) {
        updateCheckboxPosition(item, cb, headerBottom);
      } else {
        cb.remove();
        itemCheckboxMap.delete(item);
      }
    });
  });
}

export function registerFixedEvents(): void {
  if (eventsRegistered) return;
  eventsRegistered = true;

  document.addEventListener("scroll", updateAllPositions, {
    passive: true,
    capture: true,
  });
  window.addEventListener("resize", updateAllPositions, { passive: true });

  const ytApp = document.querySelector("ytd-app");
  if (ytApp) {
    ytApp.addEventListener("scroll", updateAllPositions, { passive: true });
  }
}

export function injectFixedCheckbox(item: Element, videoInfo: VideoInfo): void {
  if (itemCheckboxMap.has(item)) {
    const existing = itemCheckboxMap.get(item)!;
    updateCheckboxPosition(item, existing, getHeaderBottom());
    return;
  }

  registerFixedEvents();

  const cb = createFixedCheckbox(videoInfo);
  getFixedContainer().appendChild(cb);
  itemCheckboxMap.set(item, cb);
  updateCheckboxPosition(item, cb, getHeaderBottom());
}

export function removeAllFixedCheckboxes(): void {
  itemCheckboxMap.forEach((cb) => cb.remove());
  itemCheckboxMap.clear();

  fixedContainer?.remove();
  fixedContainer = null;
  eventsRegistered = false;
  rafScheduled = false;

  document.removeEventListener("scroll", updateAllPositions, true);
  window.removeEventListener("resize", updateAllPositions);

  const ytApp = document.querySelector("ytd-app");
  if (ytApp) {
    ytApp.removeEventListener("scroll", updateAllPositions);
  }
}