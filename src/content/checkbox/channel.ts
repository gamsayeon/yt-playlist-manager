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

  const thumbnail = imgEl?.src || "";

  return { playlistId, title, thumbnail };
}

export function injectChannelPlaylistCheckbox(
  item: Element,
  info: { playlistId: string; title: string; thumbnail: string },
  onCheck: (playlistId: string, checked: boolean) => void
): void {
  const host = item.querySelector(".ytLockupViewModelHost") as HTMLElement | null;
  if (!host) return;

  if (host.querySelector("[data-ytpm-playlist-checkbox]")) return;

  host.style.position = "relative";

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

  // ✅ input에 직접 등록, 버블링 단계에서 stopPropagation
  input.addEventListener("mousedown", (e) => e.stopPropagation());
  input.addEventListener("pointerdown", (e) => e.stopPropagation());
  input.addEventListener("touchstart", (e) => e.stopPropagation());

  input.addEventListener("click", (e) => {
    e.stopPropagation();
    // ✅ YouTube 네비게이션 차단은 wrapper 레벨에서
  });

  // ✅ wrapper는 네비게이션 차단용으로만 사용
  wrapper.addEventListener("click", (e) => {
    e.stopImmediatePropagation();
    e.stopPropagation();
    e.preventDefault();
  });

  input.addEventListener("change", (e) => {
    e.stopPropagation();
    onCheck(info.playlistId, input.checked);
  });

  wrapper.appendChild(input);
  host.appendChild(wrapper);
}