const loginView = document.getElementById("login-view") as HTMLDivElement;
const mainView = document.getElementById("main-view") as HTMLDivElement;
const loginBtn = document.getElementById("login-btn") as HTMLButtonElement;
const logoutBtn = document.getElementById("logout-btn") as HTMLButtonElement;
const userInfo = document.getElementById("user-info") as HTMLParagraphElement;

async function init(): Promise<void> {
  const { userId } = await chrome.storage.local.get("userId");

  if (userId) {
    showMainView(userId);
  } else {
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

loginBtn.addEventListener("click", async () => {
  loginBtn.disabled = true;
  loginBtn.textContent = "로그인 중...";

  const response = await chrome.runtime.sendMessage({ type: "LOGIN" });

  if (response.success) {
    showMainView(response.userId);
  } else {
    alert(`로그인 실패: ${response.error}`);
    loginBtn.disabled = false;
    loginBtn.textContent = "Google 계정으로 로그인";
  }
});

logoutBtn.addEventListener("click", async () => {
  const response = await chrome.runtime.sendMessage({ type: "LOGOUT" });

  if (response.success) {
    showLoginView();
  } else {
    alert(`로그아웃 실패: ${response.error}`);
  }
});

init();