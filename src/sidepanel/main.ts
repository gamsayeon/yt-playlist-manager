import { MessageResponse } from "../types/message";

const loginView = document.getElementById("login-view") as HTMLDivElement;
const mainView = document.getElementById("main-view") as HTMLDivElement;
const loginBtn = document.getElementById("login-btn") as HTMLButtonElement;
const logoutBtn = document.getElementById("logout-btn") as HTMLButtonElement;
const userInfo = document.getElementById("user-info") as HTMLParagraphElement;

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
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !("userId" in changes)) return;

  const { newValue } = changes.userId;

  if (newValue) {
    showMainView(newValue);
  } else {
    showLoginView();
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