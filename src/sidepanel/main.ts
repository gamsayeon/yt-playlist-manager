import { MessageResponse } from "../types/message";
import { VideoItem } from "../types";
import { TempList } from "../components/TempList";
import { PlaylistItem } from "../background/youtube-api";

const loginView = document.getElementById("login-view") as HTMLDivElement;
const mainView = document.getElementById("main-view") as HTMLDivElement;
const loginBtn = document.getElementById("login-btn") as HTMLButtonElement;
const logoutBtn = document.getElementById("logout-btn") as HTMLButtonElement;
const userInfo = document.getElementById("user-info") as HTMLParagraphElement;
const tempListContainer = document.getElementById("temp-list-container") as HTMLDivElement;

const playlistTitleInput = document.getElementById("playlist-title") as HTMLInputElement;
const playlistDescriptionInput = document.getElementById("playlist-description") as HTMLTextAreaElement;
const playlistPrivacySelect = document.getElementById("playlist-privacy") as HTMLSelectElement;
const submitPlaylistBtn = document.getElementById("submit-playlist-btn") as HTMLButtonElement;
const formTitleText = document.getElementById("form-title-text") as HTMLHeadingElement;

const playlistListContainer = document.getElementById("playlist-list-container") as HTMLDivElement;
const refreshPlaylistsBtn = document.getElementById("refresh-playlists-btn") as HTMLButtonElement;
const headerSection = document.getElementById("header-section") as HTMLDivElement;
const divider = document.getElementById("divider") as HTMLDivElement;
const tempSection = document.getElementById("temp-section") as HTMLDivElement;
const playlistSection = document.getElementById("playlist-section") as HTMLDivElement;

const tempListMode = document.getElementById("temp-list-mode") as HTMLDivElement;
const playlistEditMode = document.getElementById("playlist-edit-mode") as HTMLDivElement;
const playlistEditTitle = document.getElementById("playlist-edit-title") as HTMLParagraphElement;
const playlistItemsContainer = document.getElementById("playlist-items-container") as HTMLDivElement;
const backBtn = document.getElementById("back-btn") as HTMLButtonElement;

const tempList = new TempList(tempListContainer);

let currentTempList: VideoItem[] = [];
let isInitialized = false;

let selectedPlaylist: {
  id: string;
  title: string;
  description: string;
  privacyStatus: string;
} | null = null;

// ✅ 로컬에서 제거 대기 중인 playlistItemId 목록
let pendingRemovals: string[] = [];

const PLAYLIST_ITEM_HEIGHT = 41;
const PLAYLIST_ITEM_GAP = 4;
const PLAYLIST_HEADER_HEIGHT = 40;
const MIN_SECTION_HEIGHT = 80;
const PLAYLIST_INITIAL_HEIGHT =
  (PLAYLIST_ITEM_HEIGHT + PLAYLIST_ITEM_GAP) * 3 + PLAYLIST_HEADER_HEIGHT;

let isDraggedManually = false;
let userTempRatio = 0;

function calculateHeights(availableHeight: number): {
  tempHeight: number;
  playlistHeight: number;
} {
  const playlistHeight = Math.max(
    MIN_SECTION_HEIGHT,
    Math.min(PLAYLIST_INITIAL_HEIGHT, availableHeight * 0.4)
  );
  const tempHeight = Math.max(MIN_SECTION_HEIGHT, availableHeight - playlistHeight);
  return { tempHeight, playlistHeight };
}

function applyHeight(tempHeight: number, playlistHeight: number): void {
  tempSection.style.flex = "none";
  tempSection.style.height = `${tempHeight}px`;
  playlistSection.style.flex = "none";
  playlistSection.style.height = `${playlistHeight}px`;
}

function getAvailableHeight(): number {
  const mainHeight = mainView.getBoundingClientRect().height;
  const headerHeight = headerSection.getBoundingClientRect().height;
  const dividerHeight = divider.getBoundingClientRect().height;
  return mainHeight - headerHeight - dividerHeight;
}

function applyInitialHeight(): void {
  requestAnimationFrame(() => {
    const availableHeight = getAvailableHeight();
    const { tempHeight, playlistHeight } = calculateHeights(availableHeight);
    applyHeight(tempHeight, playlistHeight);
  });
}

function initResizeHandler(): void {
  window.addEventListener("resize", () => {
    const availableHeight = getAvailableHeight();

    if (isDraggedManually && userTempRatio > 0) {
      const newTempHeight = Math.max(
        MIN_SECTION_HEIGHT,
        Math.round(availableHeight * userTempRatio)
      );
      const newPlaylistHeight = Math.max(
        MIN_SECTION_HEIGHT,
        availableHeight - newTempHeight
      );
      applyHeight(newTempHeight, newPlaylistHeight);
    } else {
      const { tempHeight, playlistHeight } = calculateHeights(availableHeight);
      applyHeight(tempHeight, playlistHeight);
    }
  });
}

function initDivider(): void {
  let startY = 0;
  let startTempHeight = 0;
  let startPlaylistHeight = 0;

  const onMouseMove = (e: MouseEvent) => {
    const delta = e.clientY - startY;
    const newTempHeight = startTempHeight + delta;
    const newPlaylistHeight = startPlaylistHeight - delta;

    if (newTempHeight < MIN_SECTION_HEIGHT || newPlaylistHeight < MIN_SECTION_HEIGHT) return;

    tempSection.style.height = `${newTempHeight}px`;
    playlistSection.style.height = `${newPlaylistHeight}px`;
  };

  const onMouseUp = () => {
    divider.classList.remove("dragging");
    document.body.style.cursor = "";
    document.body.style.userSelect = "";

    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);

    const totalHeight =
      tempSection.getBoundingClientRect().height +
      playlistSection.getBoundingClientRect().height;
    if (totalHeight > 0) {
      isDraggedManually = true;
      userTempRatio = tempSection.getBoundingClientRect().height / totalHeight;
    }
  };

  divider.addEventListener("mousedown", (e) => {
    startY = e.clientY;
    startTempHeight = tempSection.getBoundingClientRect().height;
    startPlaylistHeight = playlistSection.getBoundingClientRect().height;
    divider.classList.add("dragging");
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });
}

function switchToTempListMode(): void {
  tempListMode.classList.remove("hidden");
  playlistEditMode.classList.add("hidden");
  selectedPlaylist = null;
  pendingRemovals = [];

  formTitleText.textContent = "재생목록 생성";
  submitPlaylistBtn.textContent = "재생목록 생성";
  playlistTitleInput.value = "";
  playlistDescriptionInput.value = "";
  playlistPrivacySelect.value = "private";
  updateSubmitBtn();
}

function switchToEditMode(playlist: {
  id: string;
  title: string;
  description: string;
  privacyStatus: string;
}): void {
  selectedPlaylist = playlist;
  pendingRemovals = [];
  tempListMode.classList.add("hidden");
  playlistEditMode.classList.remove("hidden");

  playlistEditTitle.textContent = playlist.title;

  formTitleText.textContent = "재생목록 수정";
  submitPlaylistBtn.textContent = "재생목록 수정";
  playlistTitleInput.value = playlist.title;
  playlistDescriptionInput.value = playlist.description;
  playlistPrivacySelect.value = playlist.privacyStatus;
  submitPlaylistBtn.disabled = false;
}

function updateSubmitBtn(): void {
  if (selectedPlaylist) {
    submitPlaylistBtn.disabled = playlistTitleInput.value.trim().length === 0;
  } else {
    const hasVideos = currentTempList.length > 0;
    const hasTitle = playlistTitleInput.value.trim().length > 0;
    submitPlaylistBtn.disabled = !hasVideos || !hasTitle;
  }
}

function renderPlaylistItems(items: PlaylistItem[]): void {
  playlistItemsContainer.innerHTML = "";

  if (items.length === 0) {
    const empty = document.createElement("p");
    empty.className = "playlist-video-empty";
    empty.textContent = "영상이 없습니다.";
    playlistItemsContainer.appendChild(empty);
    return;
  }

  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "playlist-video-item";
    row.dataset.playlistItemId = item.playlistItemId;

    if (pendingRemovals.includes(item.playlistItemId)) {
      row.classList.add("pending-removal");
    }

    const thumbnail = document.createElement("img");
    thumbnail.className = "playlist-video-thumbnail";
    thumbnail.src = item.thumbnail;
    thumbnail.alt = item.title;
    thumbnail.addEventListener("error", () => {
      thumbnail.src = `https://i.ytimg.com/vi/${item.videoId}/mqdefault.jpg`;
    });

    const title = document.createElement("p");
    title.className = "playlist-video-title";
    title.textContent = item.title;
    title.title = item.title;

    const removeBtn = document.createElement("button");
    removeBtn.className = "playlist-video-remove-btn";
    removeBtn.textContent = pendingRemovals.includes(item.playlistItemId) ? "↩" : "✕";
    removeBtn.setAttribute("aria-label", `${item.title} 제거`);

    removeBtn.addEventListener("click", () => {
      if (pendingRemovals.includes(item.playlistItemId)) {
        pendingRemovals = pendingRemovals.filter((id) => id !== item.playlistItemId);
      } else {
        pendingRemovals.push(item.playlistItemId);
      }
      row.classList.toggle("pending-removal");
      removeBtn.textContent = pendingRemovals.includes(item.playlistItemId) ? "↩" : "✕";
    });

    row.appendChild(thumbnail);
    row.appendChild(title);
    row.appendChild(removeBtn);
    playlistItemsContainer.appendChild(row);
  });
}

async function loadPlaylistItems(playlistId: string): Promise<void> {
  playlistItemsContainer.innerHTML =
    `<p class="playlist-video-loading">불러오는 중...</p>`;
  pendingRemovals = [];

  try {
    const response = await chrome.runtime.sendMessage({
      type: "GET_PLAYLIST_ITEMS",
      payload: { playlistId },
    });

    if (response.success) {
      renderPlaylistItems(response.playlistItems ?? []);
    } else {
      playlistItemsContainer.innerHTML =
        `<p class="playlist-video-empty">불러오기 실패</p>`;
    }
  } catch {
    playlistItemsContainer.innerHTML =
      `<p class="playlist-video-empty">불러오기 실패</p>`;
  }
}

function renderPlaylists(
  playlists: {
    id: string;
    title: string;
    description: string;
    privacyStatus: string;
    itemCount: number;
  }[]
): void {
  playlistListContainer.innerHTML = "";

  if (playlists.length === 0) {
    const empty = document.createElement("p");
    empty.className = "playlist-empty";
    empty.textContent = "재생목록이 없습니다.";
    playlistListContainer.appendChild(empty);
    return;
  }

  playlists.forEach((playlist) => {
    const item = document.createElement("div");
    item.className = "playlist-item";
    item.dataset.playlistId = playlist.id;

    const title = document.createElement("p");
    title.className = "playlist-item-title";
    title.textContent = playlist.title;
    title.title = playlist.title;

    const count = document.createElement("span");
    count.className = "playlist-item-count";
    count.textContent = `${playlist.itemCount}개`;

    const addBtn = document.createElement("button");
    addBtn.className = "playlist-item-add-btn";
    addBtn.textContent = "+";
    addBtn.title = "임시 리스트 영상 추가";
    addBtn.disabled = currentTempList.length === 0;
    addBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await handleAddTempToPlaylist(playlist.id, playlist.title, addBtn);
    });

    item.appendChild(title);
    item.appendChild(count);
    item.appendChild(addBtn);

    item.addEventListener("click", async () => {
      switchToEditMode({
        id: playlist.id,
        title: playlist.title,
        description: playlist.description ?? "",
        privacyStatus: playlist.privacyStatus ?? "private",
      });
      await loadPlaylistItems(playlist.id);
    });

    playlistListContainer.appendChild(item);
  });
}

async function handleAddTempToPlaylist(
  playlistId: string,
  playlistTitle: string,
  btn: HTMLButtonElement
): Promise<void> {
  if (currentTempList.length === 0) {
    alert("추가할 영상이 없습니다.");
    return;
  }

  if (!confirm(`"${playlistTitle}"에 ${currentTempList.length}개의 영상을 추가할까요?`)) {
    return;
  }

  try {
    btn.disabled = true;
    btn.textContent = "...";

    const response: MessageResponse = await chrome.runtime.sendMessage({
      type: "ADD_TEMP_TO_PLAYLIST",
      payload: { playlistId },
    });

    if (response.success) {
      renderPlaylists(response.playlists ?? []);
    } else {
      alert(`추가 실패: ${response.error}`);
    }
  } catch (error) {
    alert(`오류 발생: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    btn.textContent = "+";
    btn.disabled = currentTempList.length === 0;
  }
}

async function loadPlaylists(forceRefresh = false): Promise<void> {
  try {
    refreshPlaylistsBtn.disabled = true;
    refreshPlaylistsBtn.textContent = "...";

    const response = await chrome.runtime.sendMessage({
      type: forceRefresh ? "REFRESH_PLAYLISTS" : "GET_PLAYLISTS",
    });

    if (response.success) {
      renderPlaylists(response.playlists ?? []);
    } else {
      console.error("[YT Playlist Manager] 재생목록 로드 실패:", response.error);
    }
  } catch (error) {
    console.error("[YT Playlist Manager] 재생목록 로드 실패:", error);
  } finally {
    refreshPlaylistsBtn.disabled = false;
    refreshPlaylistsBtn.textContent = "↺";
  }
}

async function loadTempList(): Promise<void> {
  try {
    const response = await chrome.runtime.sendMessage({ type: "GET_TEMP_LIST" });
    if (response.success) {
      currentTempList = response.list as VideoItem[];
      tempList.render(currentTempList);
      updateSubmitBtn();
    }
  } catch (error) {
    console.error("[YT Playlist Manager] tempList 로드 실패:", error);
  }
}

function showLoginView(): void {
  loginView.classList.remove("hidden");
  mainView.classList.add("hidden");
  userInfo.textContent = "";
  playlistListContainer.innerHTML = "";
  currentTempList = [];
  isDraggedManually = false;
  userTempRatio = 0;
  selectedPlaylist = null;
  pendingRemovals = [];
}

async function showMainView(userId: string): Promise<void> {
  loginView.classList.add("hidden");
  mainView.classList.remove("hidden");

  applyInitialHeight();
  switchToTempListMode();

  const { displayName } = await chrome.storage.local.get("displayName");
  userInfo.textContent = displayName ?? `채널 ID: ${userId}`;

  await Promise.all([loadTempList(), loadPlaylists()]);
}

async function init(): Promise<void> {
  loginView.classList.add("hidden");
  mainView.classList.add("hidden");

  initDivider();
  initResizeHandler();

  try {
    const { userId } = await chrome.storage.local.get("userId");
    if (userId) {
      await showMainView(userId);
    } else {
      showLoginView();
    }
  } catch (error) {
    console.error("초기화 실패:", error);
    showLoginView();
  } finally {
    isInitialized = true;
  }
}

backBtn.addEventListener("click", () => {
  switchToTempListMode();
});

playlistTitleInput.addEventListener("input", () => {
  updateSubmitBtn();
});

refreshPlaylistsBtn.addEventListener("click", () => {
  loadPlaylists(true);
});

submitPlaylistBtn.addEventListener("click", async () => {
  const title = playlistTitleInput.value.trim();
  const description = playlistDescriptionInput.value.trim();
  const privacyStatus = playlistPrivacySelect.value;

  if (!title) return;

  // 수정 모드
  if (selectedPlaylist) {
    try {
      submitPlaylistBtn.disabled = true;
      submitPlaylistBtn.textContent = "수정 중...";

      // ✅ 제거 대기 중인 영상 일괄 삭제
      for (const playlistItemId of pendingRemovals) {
        await chrome.runtime.sendMessage({
          type: "REMOVE_FROM_PLAYLIST",
          payload: { playlistItemId },
        });
      }

      // ✅ 재생목록 정보 수정
      const response: MessageResponse = await chrome.runtime.sendMessage({
        type: "UPDATE_PLAYLIST",
        payload: {
          playlistId: selectedPlaylist.id,
          title,
          description,
          privacyStatus,
          removedCount: pendingRemovals.length, // ✅ 제거된 영상 수 전달
        },
      });

      if (response.success) {
        // ✅ loadPlaylists로 캐시 갱신 없이 현재 목록 유지
        await loadPlaylists();
        switchToTempListMode();
      } else {
        alert(`수정 실패: ${response.error}`);
        submitPlaylistBtn.disabled = false;
      }
    } catch (error) {
      alert(`오류 발생: ${error instanceof Error ? error.message : String(error)}`);
      submitPlaylistBtn.disabled = false;
    } finally {
      submitPlaylistBtn.textContent = "재생목록 수정";
    }
    return;
  }

  // 생성 모드
  try {
    submitPlaylistBtn.disabled = true;
    submitPlaylistBtn.textContent = "생성 중...";

    const response: MessageResponse = await chrome.runtime.sendMessage({
      type: "CREATE_PLAYLIST",
      payload: { title, description, privacyStatus },
    });

    if (response.success) {
      switchToTempListMode();
      renderPlaylists(response.playlists ?? []);
    } else {
      alert(`재생목록 생성 실패: ${response.error}`);
      submitPlaylistBtn.disabled = false;
    }
  } catch (error) {
    alert(`오류 발생: ${error instanceof Error ? error.message : String(error)}`);
    submitPlaylistBtn.disabled = false;
  } finally {
    submitPlaylistBtn.textContent = "재생목록 생성";
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (!isInitialized) return;

  if ("userId" in changes) {
    const { newValue } = changes.userId;
    if (newValue) {
      void showMainView(newValue);
    } else {
      showLoginView();
    }
  }

  if ("tempList" in changes) {
    currentTempList = (changes.tempList.newValue as VideoItem[]) ?? [];
    tempList.render(currentTempList);
    updateSubmitBtn();
    document.querySelectorAll<HTMLButtonElement>(".playlist-item-add-btn").forEach((btn) => {
      btn.disabled = currentTempList.length === 0;
    });
  }
});

loginBtn.addEventListener("click", async () => {
  try {
    loginBtn.disabled = true;
    loginBtn.textContent = "로그인 중...";

    const response: MessageResponse = await chrome.runtime.sendMessage({
      type: "LOGIN",
    });

    if (!response.success) {
      alert(`로그인 실패: ${response.error}`);
    }
  } catch (error) {
    alert(`오류 발생: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Google 계정으로 로그인";
  }
});

logoutBtn.addEventListener("click", async () => {
  try {
    logoutBtn.disabled = true;
    logoutBtn.textContent = "로그아웃 중...";

    const response: MessageResponse = await chrome.runtime.sendMessage({
      type: "LOGOUT",
    });

    if (!response.success) {
      alert(`로그아웃 실패: ${response.error}`);
    }
  } catch (error) {
    alert(`오류 발생: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    logoutBtn.disabled = false;
    logoutBtn.textContent = "로그아웃";
  }
});

init();