const CHECKBOX_CLASS = "yt-playlist-manager-checkbox";
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
  wrapper.className = CHECKBOX_CLASS;
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

  input.addEventListener("change", () => {
    wrapper.dataset.checked = String(input.checked);
    wrapper.dispatchEvent(
      new CustomEvent("yt-checkbox-change", {
        bubbles: true,
        detail: { videoInfo, checked: input.checked },
      })
    );
  });

  wrapper.appendChild(input);
  return wrapper;
}

/** 썸네일에 체크박스 삽입 */
export function injectCheckboxes(): void {
  const items = document.querySelectorAll(ITEM_SELECTOR);

  items.forEach((item) => {
    if (item.querySelector(`.${CHECKBOX_CLASS}`)) return;

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
  document.querySelectorAll(`.${CHECKBOX_CLASS}`).forEach((el) => el.remove());
}