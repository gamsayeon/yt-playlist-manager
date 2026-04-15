import {
  parseHomeVideoInfo,
  injectHomeVideoCheckbox,
  parseHomeShortsInfo,
  injectHomeShortsCheckbox,
  removeHomeShortsCheckboxes,
  parseSearchVideoInfo,
  parseSearchShortsInfo,
  injectSearchCheckbox,
  injectSearchShortsCheckbox,
  parseWatchVideoInfo,
  injectWatchCheckbox,
  parseWatchShortsInfo,
  injectWatchShortsCheckbox,
  parseChannelVideoInfo,
  injectChannelCheckbox,
  parseChannelPlaylistInfo,
  injectChannelPlaylistCheckbox,
  injectShortsPageCheckbox,
  removeCheckboxes,
} from "./checkbox";
import { onMutation } from "./observer";

console.log("[YT Playlist Manager] content script loaded");

let isLoggedIn = false;
let isNavigating = false;

function isLiveItem(item: Element): boolean {
  return !!item.querySelector("badge-shape.yt-badge-shape--thumbnail-live");
}

function clearProcessedAttributes(): void {
  document.querySelectorAll("[data-ytpm-processed]").forEach((el) => {
    el.removeAttribute("data-ytpm-processed");
  });
}

function getVideoId(item: Element): string | null {
  const isShorts = !!item.querySelector("a.shortsLockupViewModelHostEndpoint");
  if (isShorts) {
    const link = item.querySelector(
      "a.shortsLockupViewModelHostEndpoint[tabindex='-1']"
    ) as HTMLAnchorElement | null;
    return link?.href.match(/\/shorts\/([^?&]+)/)?.[1] ?? null;
  }
  const link = item.querySelector(
    "a.yt-lockup-view-model__content-image, a.ytLockupViewModelContentImage"
  ) as HTMLAnchorElement | null;
  return link?.href.match(/[?&]v=([^&]+)/)?.[1] ?? null;
}

function tryInjectRichItem(item: Element): void {
  if (item.closest("ytd-rich-shelf-renderer[has-rounded-box-art-thumbnail-style]")) return;
  if (isLiveItem(item)) return;

  const processed = (item as HTMLElement).dataset.ytpmProcessed;
  const currentVideoId = getVideoId(item);

  if (processed && processed === currentVideoId) return;

  const isShorts = !!item.querySelector("a.shortsLockupViewModelHostEndpoint");

  if (isShorts) {
    const videoInfo = parseHomeShortsInfo(item);
    if (videoInfo) {
      injectHomeShortsCheckbox(item, videoInfo);
      (item as HTMLElement).dataset.ytpmProcessed = videoInfo.videoId;
    }
    return;
  }

  if (item.querySelector("ytd-rich-grid-media")) {
    const videoInfo = parseChannelVideoInfo(item);
    if (videoInfo) {
      injectChannelCheckbox(item, videoInfo);
      (item as HTMLElement).dataset.ytpmProcessed = videoInfo.videoId;
    }
    return;
  }

  const videoInfo = parseHomeVideoInfo(item);
  if (videoInfo) {
    injectHomeVideoCheckbox(item, videoInfo);
    (item as HTMLElement).dataset.ytpmProcessed = videoInfo.videoId;
  }
}

// ✅ 채널 재생목록 체크박스 체크 핸들러
async function handlePlaylistCheck(
  playlistId: string,
  checked: boolean
): Promise<void> {
  if (!checked) return;

  try {
    const response = await chrome.runtime.sendMessage({
      type: "GET_PLAYLIST_ITEMS_FOR_TEMP",
      payload: { playlistId },
    });

    if (!response.success) {
      console.error("[YT Playlist Manager] 재생목록 영상 조회 실패:", response.error);
    }
  } catch (error) {
    console.error("[YT Playlist Manager] 재생목록 영상 조회 오류:", error);
  }
}

function injectCheckboxes(): void {
  if (!isLoggedIn) return;
  if (isNavigating) return;

  const path = location.pathname;

  if (path.startsWith("/shorts/")) {
    injectShortsPageCheckbox();
    return;
  }

  // ✅ 단일 루프로 통합
  document.querySelectorAll("ytd-rich-item-renderer").forEach((item) => {
    tryInjectRichItem(item);
  });

  // ytd-grid-video-renderer (채널 탭)
  document.querySelectorAll("ytd-grid-video-renderer").forEach((item) => {
    if (isLiveItem(item)) return;
    const videoInfo = parseChannelVideoInfo(item);
    if (videoInfo) injectChannelCheckbox(item, videoInfo);
  });

  // 검색 결과 일반 영상
  document.querySelectorAll("ytd-video-renderer").forEach((item) => {
    if (isLiveItem(item)) return;
    const videoInfo = parseSearchVideoInfo(item);
    if (videoInfo) injectSearchCheckbox(item, videoInfo);
  });

  // 검색 결과 쇼츠
  document.querySelectorAll(".ytGridShelfViewModelGridShelfItem").forEach((item) => {
    const videoInfo = parseSearchShortsInfo(item);
    if (videoInfo) injectSearchShortsCheckbox(item, videoInfo);
  });

  // /watch 추천 영상
  document.querySelectorAll("yt-lockup-view-model").forEach((item) => {
    if (item.closest("ytd-rich-shelf-renderer[has-rounded-box-art-thumbnail-style]")) return;
    if (isLiveItem(item)) return;

    // ✅ 재생목록 카드 체크박스 주입 (내 채널 + 다른 채널)
    const playlistInfo = parseChannelPlaylistInfo(item);
    if (playlistInfo) {
      injectChannelPlaylistCheckbox(item, playlistInfo, handlePlaylistCheck);
      return;
    }

    // 일반 영상 체크박스
    const videoInfo = parseWatchVideoInfo(item);
    if (videoInfo) injectWatchCheckbox(item, videoInfo);
  });

  // /watch 쇼츠
  document
    .querySelectorAll("ytd-reel-shelf-renderer ytm-shorts-lockup-view-model-v2")
    .forEach((item) => {
      const videoInfo = parseWatchShortsInfo(item);
      if (videoInfo) injectWatchShortsCheckbox(item, videoInfo);
    });
}

chrome.storage.local.get("userId").then(({ userId }) => {
  isLoggedIn = !!userId;
  if (isLoggedIn) injectCheckboxes();
});

onMutation(() => injectCheckboxes());

document.addEventListener("yt-navigate-start", () => {
  isNavigating = true;
  removeHomeShortsCheckboxes();
  removeCheckboxes();
  clearProcessedAttributes();
});

document.addEventListener("yt-navigate-finish", () => {
  isNavigating = false;
  injectCheckboxes();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;

  if ("userId" in changes) {
    const { newValue } = changes.userId;
    if (newValue) {
      isLoggedIn = true;
      removeCheckboxes();
      removeHomeShortsCheckboxes();
      clearProcessedAttributes();
      injectCheckboxes();
    } else {
      isLoggedIn = false;
      removeCheckboxes();
      removeHomeShortsCheckboxes();
      clearProcessedAttributes();
    }
  }

  if ("tempList" in changes) {
    const list: { videoId: string }[] = changes.tempList.newValue ?? [];
    const checkedIds = new Set(list.map((v) => v.videoId));

    document.querySelectorAll("[data-ytpm-checkbox]").forEach((cb) => {
      const input = cb.querySelector("input") as HTMLInputElement | null;
      const videoId = (cb as HTMLElement).dataset.videoId;
      if (input && videoId) {
        input.checked = checkedIds.has(videoId);
        (cb as HTMLElement).dataset.checked = String(input.checked);
      }
    });
  }
});