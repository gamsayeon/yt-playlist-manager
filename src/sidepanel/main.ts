import { MessageResponse } from "../types/message";
import { VideoItem } from "../types";
import { TempList } from "../components/TempList";

const loginView = document.getElementById("login-view") as HTMLDivElement;
const mainView = document.getElementById("main-view") as HTMLDivElement;
const loginBtn = document.getElementById("login-btn") as HTMLButtonElement;
const logoutBtn = document.getElementById("logout-btn") as HTMLButtonElement;
const userInfo = document.getElementById("user-info") as HTMLParagraphElement;
const tempListContainer = document.getElementById("temp-list-container") as HTMLDivElement;

// 재생목록 생성 폼 요소
const playlistTitleInput = document.getElementById("playlist-title") as HTMLInputElement;
const playlistDescriptionInput = document.getElementById("playlist-description") as HTMLTextAreaElement;
const playlistPrivacySelect = document.getElementById("playlist-privacy") as HTMLSelectElement;
const createPlaylistBtn = document.getElementById("create-playlist-btn") as HTMLButtonElement;

const tempList = new TempList(tempListContainer);

// 생성 버튼 활성화/비활성화 업데이트
function updateCreateBtn(list: VideoItem[]): void {
  const hasVideos = list.length > 0;
  const hasTitle = playlistTitleInput.value.trim().length > 0;
  createPlaylistBtn.disabled = !hasVideos || !hasTitle;
}

async function loadTempList(): Promise<void> {
  try {
    const response = await chrome.runtime.sendMessage({ type: "GET_TEMP_LIST" });
    if (response.success) {
      const list = response.list as VideoItem[];
      tempList.render(list);
      updateCreateBtn(list);
    }
  } catch (error) {
    console.error("[YT Playlist Manager] tempList 로드 실패:", error);
  }
}

async function init(): Promise<void> {
  try {
    const { userId } = await chrome.storage.local.get("userId");

    if (userId) {
      showMainView(userId);
    } else {
      showLoginView();
    }
  } catch (error) {
    console.error("초기화 실패:", error);
    showLoginView();
  }
}

function showLoginView(): void {
  loginView.classList.remove("hidden");
  mainView.classList.add("hidden");
}

function showMainView(userId: string): void {
  loginView.classList.add("hidden");
  mainView.classList.remove("hidden");
  userInfo.textContent = `채널 ID: ${userId}`;
  loadTempList();
}

// 제목 입력 시 버튼 활성화 상태 갱신
playlistTitleInput.addEventListener("input", async () => {
  try {
    const response = await chrome.runtime.sendMessage({ type: "GET_TEMP_LIST" });
    if (response.success) {
      updateCreateBtn(response.list as VideoItem[]);
    }
  } catch (error) {
    console.error("[YT Playlist Manager] tempList 조회 실패:", error);
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;

  if ("userId" in changes) {
    const { newValue } = changes.userId;
    if (newValue) {
      showMainView(newValue);
    } else {
      showLoginView();
    }
  }

  if ("tempList" in changes) {
    const list = (changes.tempList.newValue as VideoItem[]) ?? [];
    tempList.render(list);
    updateCreateBtn(list);
  }
});

loginBtn.addEventListener("click", async () => {
  try {
    loginBtn.disabled = true;
    loginBtn.textContent = "로그인 중...";

    const response: MessageResponse = await chrome.runtime.sendMessage({ type: "LOGIN" });

    if (response.success) {
      showMainView(response.userId as string);
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

    const response: MessageResponse = await chrome.runtime.sendMessage({ type: "LOGOUT" });

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