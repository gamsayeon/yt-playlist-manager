import { clearTempList } from "./storage";

const STORAGE_KEY = "userId";
const DISPLAY_NAME_KEY = "displayName";
const HANDLE_KEY = "userHandle";

export async function getAuthToken(interactive: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError || !token) {
        reject(chrome.runtime.lastError?.message ?? "토큰 획득 실패");
        return;
      }
      resolve(token);
    });
  });
}

export async function refreshAuthToken(expiredToken?: string): Promise<string> {
  const tokenToRemove = expiredToken ?? (await getAuthToken(false));

  await new Promise<void>((resolve, reject) => {
    chrome.identity.removeCachedAuthToken({ token: tokenToRemove }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError.message);
        return;
      }
      resolve();
    });
  });

  return getAuthToken(false);
}

async function fetchUserInfo(
  token: string,
  isRetry = false
): Promise<{ userId: string; displayName: string; userHandle: string }> {
  const response = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true",
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (response.status === 401 && !isRetry) {
    const newToken = await refreshAuthToken(token);
    return fetchUserInfo(newToken, true);
  }

  if (!response.ok) {
    throw new Error(`채널 조회 실패: ${response.status}`);
  }

  const data = await response.json();
  const channel = data.items?.[0];

  if (!channel) {
    throw new Error("채널 정보를 찾을 수 없습니다.");
  }

  return {
    userId: channel.id,
    displayName: channel.snippet.title,
    userHandle: channel.snippet.customUrl ?? "",
  };
}

export async function login(): Promise<string> {
  const token = await getAuthToken(true);
  const { userId, displayName, userHandle } = await fetchUserInfo(token);

  await chrome.storage.local.set({
    [STORAGE_KEY]: userId,
    [DISPLAY_NAME_KEY]: displayName,
    [HANDLE_KEY]: userHandle,
  });

  return userId;
}

export async function logout(): Promise<void> {
  const token = await getAuthToken(false).catch(() => null);

  if (token) {
    await new Promise<void>((resolve, reject) => {
      chrome.identity.removeCachedAuthToken({ token }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError.message);
          return;
        }
        resolve();
      });
    });
  }

  // ✅ HANDLE_KEY 추가, 기존 토큰 제거 로직 복구
  await chrome.storage.local.remove([STORAGE_KEY, DISPLAY_NAME_KEY, HANDLE_KEY]);
  await clearTempList();
}