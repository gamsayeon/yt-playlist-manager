import type { VideoInfo } from "./types";

export function createCheckbox(videoInfo: VideoInfo): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.setAttribute("data-ytpm-checkbox", "true");
  wrapper.dataset.videoId = videoInfo.videoId;
  wrapper.style.cssText = `
    position: absolute;
    top: 8px;
    left: 8px;
    z-index: 2147483647;
    width: 20px;
    height: 20px;
    cursor: pointer;
    isolation: isolate;
    pointer-events: auto;
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

export function injectInto(anchor: HTMLElement, videoInfo: VideoInfo): void {
  const existing = anchor.querySelector("[data-ytpm-checkbox]") as HTMLElement | null;
  if (existing) {
    // SPA 특성상 동일 DOM 요소가 다른 영상에 재사용될 수 있으므로 videoId 비교
    if (existing.dataset.videoId === videoInfo.videoId) return;
    existing.remove();
  }

  anchor.style.position = "relative";
  anchor.appendChild(createCheckbox(videoInfo));
}

export function removeCheckboxes(): void {
  document.querySelectorAll("[data-ytpm-checkbox]").forEach((el) => el.remove());
}