import type { VideoInfo } from "./types";
import { injectInto, getThumbnailUrl } from "./utils";

export function parseChannelVideoInfo(item: Element): VideoInfo | null {
  const thumbnailLink = item.querySelector(
    "ytd-thumbnail a#thumbnail"
  ) as HTMLAnchorElement | null;
  if (!thumbnailLink?.href) return null;

  const videoIdMatch = thumbnailLink.href.match(/[?&]v=([^&]+)/);
  if (!videoIdMatch) return null;

  const videoId = videoIdMatch[1];
  const title =
    item.querySelector("#video-title, #title")?.textContent?.trim() ?? "";
  const imgEl = item.querySelector(
    "ytd-thumbnail img, yt-image img"
  ) as HTMLImageElement | null;
  return { videoId, title, thumbnail: getThumbnailUrl(videoId, imgEl) };
}

export function injectChannelCheckbox(item: Element, videoInfo: VideoInfo): void {
  const anchor = item.querySelector("ytd-thumbnail") as HTMLElement | null;
  if (!anchor) return;
  injectInto(anchor, videoInfo);
}

// ✅ 채널 재생목록 탭 파싱 (내 채널 + 다른 채널 모두 동일 구조)
export function parseChannelPlaylistInfo(
  item: Element
): { playlistId: string; title: string; thumbnail: string } | null {
  const host = item.querySelector(".ytLockupViewModelHost") as HTMLElement | null;
  if (!host) return null;

  if (!host.classList.contains("ytLockupViewModelCollectionStack2")) return null;

  const contentIdClass = Array.from(host.classList).find((c) =>
    c.startsWith("content-id-")
  );
  if (!contentIdClass) return null;

  const playlistId = contentIdClass.replace("content-id-", "");
  if (!playlistId) return null;

  const title =
    (item.querySelector("h3.ytLockupMetadataViewModelHeadingReset") as HTMLElement | null)
      ?.getAttribute("title") ?? "";

  const imgEl = item.querySelector(
    "yt-thumbnail-view-model img"
  ) as HTMLImageElement | null;
  const thumbnail =
    imgEl?.src ||
    `https://i.ytimg.com/vi/${playlistId}/mqdefault.jpg`;

  return { playlistId, title, thumbnail };
}

// ✅ 채널 재생목록 체크박스 주입
export function injectChannelPlaylistCheckbox(
  item: Element,
  info: { playlistId: string; title: string; thumbnail: string },
  onCheck: (playlistId: string, checked: boolean) => void
): void {
  const host = item.querySelector(".ytLockupViewModelHost") as HTMLElement | null;
  if (!host) return;

  if (host.querySelector("[data-ytpm-playlist-checkbox]")) return;

  host.style.position = "relative";

  // ✅ yt-touch-feedback-shape의 pointer-events를 none으로
  const touchFeedback = host.querySelector("yt-touch-feedback-shape") as HTMLElement | null;
  if (touchFeedback) {
    touchFeedback.style.pointerEvents = "none";
  }

  const wrapper = document.createElement("div");
  wrapper.setAttribute("data-ytpm-playlist-checkbox", "true");
  wrapper.dataset.playlistId = info.playlistId;
  Object.assign(wrapper.style, {
    position: "absolute",
    top: "8px",
    left: "8px",
    zIndex: "2147483647",
    width: "20px",
    height: "20px",
    cursor: "pointer",
    isolation: "isolate",
    pointerEvents: "auto",
  });

  const input = document.createElement("input");
  input.type = "checkbox";
  Object.assign(input.style, {
    width: "100%",
    height: "100%",
    cursor: "pointer",
    accentColor: "rgb(255, 0, 0)",
    margin: "0",
    display: "block",
  });

  const stopNav = (e: Event) => {
    e.stopImmediatePropagation();
    e.stopPropagation();
  };

  (["mousedown", "pointerdown", "touchstart"] as const).forEach(
    (type) => wrapper.addEventListener(type, stopNav, { capture: true })
  );

  wrapper.addEventListener("click", (e) => {
    e.stopImmediatePropagation();
    e.stopPropagation();
  }, { capture: true });

  input.addEventListener("click", (e) => {
    e.stopImmediatePropagation();
    e.stopPropagation();
  }, { capture: true });

  input.addEventListener("change", (e) => {
    e.stopPropagation();
    onCheck(info.playlistId, input.checked);
  });

  wrapper.appendChild(input);
  host.appendChild(wrapper);
}