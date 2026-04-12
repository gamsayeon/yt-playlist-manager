import { MessageResponse } from "../types/message";
import { VideoItem } from "../types";
import { TempList } from "../components/TempList";

const loginView = document.getElementById("login-view") as HTMLDivElement;
const mainView = document.getElementById("main-view") as HTMLDivElement;
const loginBtn = document.getElementById("login-btn") as HTMLButtonElement;
const logoutBtn = document.getElementById("logout-btn") as HTMLButtonElement;
const userInfo = document.getElementById("user-info") as HTMLParagraphElement;
const tempListContainer = document.getElementById("temp-list-container") as HTMLDivElement;

const playlistTitleInput = document.getElementById("playlist-title") as HTMLInputElement;
const playlistDescriptionInput = document.getElementById("playlist-description") as HTMLTextAreaElement;
const playlistPrivacySelect = document.getElementById("playlist-privacy") as HTMLSelectElement;
const createPlaylistBtn = document.getElementById("create-playlist-btn") as HTMLButtonElement;

const playlistListContainer = document.getElementById("playlist-list-container") as HTMLDivElement;
const refreshPlaylistsBtn = document.getElementById("refresh-playlists-btn") as HTMLButtonElement;
const divider = document.getElementById("divider") as HTMLDivElement;
const tempSection = document.getElementById("temp-section") as HTMLDivElement;
const playlistSection = document.getElementById("playlist-section") as HTMLDivElement;

const tempList = new TempList(tempListContainer);

let currentTempList: VideoItem[] = [];
let isInitialized = false;

// ✅ mainView가 보인 후 호출해야 정확한 높이 계산 가능
function applyInitialHeight(): void {
  const PLAYLIST_INITIAL_HEIGHT = (41 + 4) * 3 + 40;

  requestAnimationFrame(() => {
    const mainHeight = mainView.getBoundingClientRect().height;
    const headerHeight =
      document.getElementById("header-section")!.getBoundingClientRect().height;
    const dividerHeight = divider.getBoundingClientRect().height;
    const availableHeight = mainHeight - headerHeight - dividerHeight - 16;

    const playlistHeight = Math.min(PLAYLIST_INITIAL_HEIGHT, availableHeight * 0.4);
    const tempHeight = availableHeight - playlistHeight;

    tempSection.style.flex = "none";
    tempSection.style.height = `${tempHeight}px`;
    playlistSection.style.flex = "none";
    playlistSection.style.height = `${playlistHeight}px`;
  });
}

// ✅ 구분선 드래그 로직
function initDivider(): void {
  let isDragging = false;
  let startY = 0;
  let startTempHeight = 0;
  let startPlaylistHeight = 0;

  divider.addEventListener("mousedown", (e) => {
    isDragging = true;
    startY = e.clientY;
    startTempHeight = tempSection.getBoundingClientRect().height;
    startPlaylistHeight = playlistSection.getBoundingClientRect().height;
    divider.classList.add("dragging");
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    const delta = e.clientY - startY;
    const newTempHeight = startTempHeight + delta;
    const newPlaylistHeight = startPlaylistHeight - delta;

    if (newTempHeight < 80 || newPlaylistHeight < 80) return;

    tempSection.style.height = `${newTempHeight}px`;
    playlistSection.style.height = `${newPlaylistHeight}px`;
  });

  document.addEventListener("mouseup", () => {
    if (!isDragging) return;
    isDragging = false;
    divider.classList.remove("dragging");
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  });
}

function updateCreateBtn(): void {
  const hasVideos = currentTempList.length > 0;
  const hasTitle = playlistTitleInput.value.trim().length > 0;
  createPlaylistBtn.disabled = !hasVideos || !hasTitle;
}

function renderPlaylists(
  playlists: { id: string; title: string; itemCount: number }[]
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

    item.appendChild(title);
    item.appendChild(count);
    playlistListContainer.appendChild(item);
  });
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
      updateCreateBtn();
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
}

async function showMainView(userId: string): Promise<void> {
  loginView.classList.add("hidden");
  mainView.classList.remove("hidden");

  // ✅ hidden 제거 후 높이 계산
  applyInitialHeight();

  const { displayName } = await chrome.storage.local.get("displayName");
  userInfo.textContent = displayName ?? `채널 ID: ${userId}`;

  await Promise.all([loadTempList(), loadPlaylists()]);
}

function resetForm(): void {
  playlistTitleInput.value = "";
  playlistDescriptionInput.value = "";
  playlistPrivacySelect.value = "private";
  updateCreateBtn();
}

async function init(): Promise<void> {
  loginView.classList.add("hidden");
  mainView.classList.add("hidden");

  initDivider();

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

playlistTitleInput.addEventListener("input", () => {
  updateCreateBtn();
});

refreshPlaylistsBtn.addEventListener("click", () => {
  loadPlaylists(true);
});

createPlaylistBtn.addEventListener("click", async () => {
  const title = playlistTitleInput.value.trim();
  const description = playlistDescriptionInput.value.trim();
  const privacyStatus = playlistPrivacySelect.value;

  if (!title) return;

  try {
    createPlaylistBtn.disabled = true;
    createPlaylistBtn.textContent = "생성 중...";

    const response: MessageResponse = await chrome.runtime.sendMessage({
      type: "CREATE_PLAYLIST",
      payload: { title, description, privacyStatus },
    });

    if (response.success) {
      resetForm();
      renderPlaylists(response.playlists ?? []);
    } else {
      alert(`재생목록 생성 실패: ${response.error}`);
      createPlaylistBtn.disabled = false;
    }
  } catch (error) {
    alert(`오류 발생: ${error instanceof Error ? error.message : String(error)}`);
    createPlaylistBtn.disabled = false;
  } finally {
    createPlaylistBtn.textContent = "재생목록 생성";
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
    updateCreateBtn();
  }
});

loginBtn.addEventListener("click", async () => {
  try {
    loginBtn.disabled = true;
    loginBtn.textContent = "로그인 중...";

    const response: MessageResponse = await chrome.runtime.sendMessage({
      type: "LOGIN",
    });

    if (response.success) {
      await showMainView(response.userId as string);
    } else {
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

    if (response.success) {
      showLoginView();
    } else {
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