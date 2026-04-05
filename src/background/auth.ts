const STORAGE_KEY = "userId";

/** Access Token 획득 */
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

/** Access Token 강제 갱신 */
export async function refreshAuthToken(): Promise<string> {
  const oldToken = await getAuthToken(false);

  await new Promise<void>((resolve, reject) => {
    chrome.identity.removeCachedAuthToken({ token: oldToken }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError.message);
        return;
      }
      resolve();
    });
  });

  return getAuthToken(false);
}

/** YouTube 채널 ID 조회 */
async function fetchUserId(token: string, isRetry = false): Promise<string> {
  const response = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=id&mine=true",
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (response.status === 401 && !isRetry) {
    const newToken = await refreshAuthToken();
    return fetchUserId(newToken, true);
  }

  if (!response.ok) {
    throw new Error(`채널 조회 실패: ${response.status}`);
  }

  const data = await response.json();
  const userId = data.items?.[0]?.id;

  if (!userId) {
    throw new Error("채널 ID를 찾을 수 없습니다.");
  }

  return userId;
}

/** 로그인 */
export async function login(): Promise<string> {
  const token = await getAuthToken(true);
  const userId = await fetchUserId(token);

  await chrome.storage.local.set({ [STORAGE_KEY]: userId });

  return userId;
}

/** 로그아웃 */
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

  await chrome.storage.local.remove(STORAGE_KEY);
}