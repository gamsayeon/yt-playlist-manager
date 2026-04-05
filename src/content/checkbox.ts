const ITEM_SELECTOR = "ytd-rich-item-renderer";

export interface VideoInfo {
  videoId: string;
  title: string;
  thumbnail: string;
}

/** 일반 영상 정보 파싱 */
function parseVideoInfo(item: Element): VideoInfo | null {
  // 일반 영상
  const videoLink = item.querySelector(
    "a.yt-lockup-view-model__content-image"
  ) as HTMLAnchorElement | null;

  if (videoLink) {
    const href = videoLink.href;
    const videoIdMatch = href.match(/[?&]v=([^&]+)/);
    if (!videoIdMatch) return null;

    const videoId = videoIdMatch[1];
    const title =
      item
        .querySelector("h3.yt-lockup-metadata-view-model__heading-reset a span")
        ?.textContent?.trim() ?? "";
    const imgEl = item.querySelector(
      "div.ytThumbnailViewModelImage img"
    ) as HTMLImageElement | null;
    const thumbnailUrl =
      imgEl?.src ?? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;

    return { videoId, title, thumbnail: thumbnailUrl };
  }

  // 쇼츠
  const shortsLink = item.querySelector(
    "a.shortsLockupViewModelHostEndpoint"
  ) as HTMLAnchorElement | null;

  if (shortsLink) {
    const href = shortsLink.href;
    const shortsIdMatch = href.match(/\/shorts\/([^?&]+)/);
    if (!shortsIdMatch) return null;

    const videoId = shortsIdMatch[1];
    const title =
      item
        .querySelector("h3.shortsLockupViewModelHostMetadataTitle a span")
        ?.textContent?.trim() ?? "";
    const imgEl = item.querySelector(
      "div.ytThumbnailViewModelImage img"
    ) as HTMLImageElement | null;
    const thumbnailUrl =
      imgEl?.src ?? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;

    return { videoId, title, thumbnail: thumbnailUrl };
  }

  return null;
}

/** 체크박스 생성 */
function createCheckbox(videoInfo: VideoInfo): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.setAttribute("data-ytpm-checkbox", "true");
  wrapper.dataset.videoId = videoInfo.videoId;
  wrapper.style.cssText = `
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 10;
    width: 20px;
    height: 20px;
    cursor: pointer;
  `;

  const input = document.createElement("input");
  input.type = "checkbox";
  input.style.cssText = `
    width: 100%;
    height: 100%;
    cursor: pointer;
    accent-color: #ff0000;
  `;

  input.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  input.addEventListener("change", (e) => {
    e.stopPropagation();

    const messageType = input.checked
      ? "ADD_TO_TEMP_LIST"
      : "REMOVE_FROM_TEMP_LIST";

    chrome.runtime.sendMessage(
      { type: messageType, payload: videoInfo },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("[YT Playlist Manager] sendMessage error", chrome.runtime.lastError);
        }
      }
    );

    wrapper.dataset.checked = String(input.checked);
  });

  wrapper.appendChild(input);
  return wrapper;
}

/** 썸네일에 체크박스 삽입 */
export function injectCheckboxes(): void {
  const items = document.querySelectorAll(ITEM_SELECTOR);

  items.forEach((item) => {
    if (item.querySelector("[data-ytpm-checkbox]")) return;

    const videoInfo = parseVideoInfo(item);
    if (!videoInfo) return;

    const thumbnail = item.querySelector(
      "yt-thumbnail-view-model"
    ) as HTMLElement | null;
    if (!thumbnail) return;

    thumbnail.style.position = "relative";

    const checkbox = createCheckbox(videoInfo);
    thumbnail.appendChild(checkbox);
  });
}

/** 모든 체크박스 제거 */
export function removeCheckboxes(): void {
  document.querySelectorAll("[data-ytpm-checkbox]").forEach((el) => el.remove());
}