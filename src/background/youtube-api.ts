import { getAuthToken, refreshAuthToken } from "./auth";
import { Playlist } from "./storage";

const BASE_URL = "https://www.googleapis.com/youtube/v3";

export class QuotaExceededError extends Error {
  constructor() {
    super("YouTube API 할당량이 초과되었습니다. 내일 다시 시도해주세요.");
    this.name = "QuotaExceededError";
  }
}

/** YouTube API 재생목록 응답 타입 */
interface YouTubePlaylistItem {
  id: string;
  snippet: {
    title: string;
  };
  contentDetails: {
    itemCount: number;
  };
}

/** YouTube API 재생목록 응답 wrapper 타입 */
interface YouTubePlaylistResponse {
  items: YouTubePlaylistItem[];
  nextPageToken?: string;
}

/** YouTube API 단일 재생목록 응답 타입 */
interface YouTubePlaylistSingleResponse {
  id: string;
  snippet: {
    title: string;
  };
  contentDetails?: {
    itemCount: number;
  };
}

/** 공개 여부 타입 */
export type PrivacyStatus = "public" | "unlisted" | "private";

/** 인증된 fetch 요청 (401 시 토큰 재발급 후 1회 재시도, 403 시 Quota 안내) */
async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const makeRequest = (token: string) =>
    fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

  let token = await getAuthToken(false);
  let response = await makeRequest(token);

  if (response.status === 401) {
    const newToken = await refreshAuthToken(token);
    response = await makeRequest(newToken);
  }

  if (response.status === 403) {
    throw new QuotaExceededError();
  }

  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`);
  }

  return response;
}

/** 재생목록 목록 조회 (페이지네이션 적용) */
export async function getPlaylists(): Promise<Playlist[]> {
  const playlists: Playlist[] = [];
  let pageToken: string | undefined;

  do {
    const url = `${BASE_URL}/playlists?part=snippet,contentDetails&mine=true&maxResults=50${
      pageToken ? `&pageToken=${pageToken}` : ""
    }`;

    const response = await fetchWithAuth(url);
    const data: YouTubePlaylistResponse = await response.json();

    data.items.forEach((item: YouTubePlaylistItem) => {
      playlists.push({
        id: item.id,
        title: item.snippet.title,
        itemCount: item.contentDetails.itemCount,
      });
    });

    pageToken = data.nextPageToken;
  } while (pageToken);

  return playlists;
}

/** 재생목록 생성 */
export async function createPlaylist(
  title: string,
  description: string = "",
  privacyStatus: PrivacyStatus = "private"
): Promise<Playlist> {
  // ✅ contentDetails 제거 - 읽기 전용이라 insert 시 400 오류 발생
  const url = `${BASE_URL}/playlists?part=snippet,status`;
  const response = await fetchWithAuth(url, {
    method: "POST",
    body: JSON.stringify({
      snippet: { title, description },
      status: { privacyStatus },
    }),
  });
  const data: YouTubePlaylistSingleResponse = await response.json();

  return {
    id: data.id,
    title: data.snippet.title,
    itemCount: data.contentDetails?.itemCount ?? 0,
  };
}

/** 재생목록 수정 */
export async function updatePlaylist(
  playlistId: string,
  title: string
): Promise<Playlist> {
  const url = `${BASE_URL}/playlists?part=snippet,contentDetails`;
  const response = await fetchWithAuth(url, {
    method: "PUT",
    body: JSON.stringify({
      id: playlistId,
      snippet: { title },
    }),
  });
  const data: YouTubePlaylistSingleResponse = await response.json();

  return {
    id: data.id,
    title: data.snippet.title,
    itemCount: data.contentDetails?.itemCount ?? 0,
  };
}

/** 재생목록 삭제 */
export async function deletePlaylist(playlistId: string): Promise<void> {
  const url = `${BASE_URL}/playlists?id=${playlistId}`;
  await fetchWithAuth(url, { method: "DELETE" });
}

/** 재생목록에 영상 추가 */
export async function addItemToPlaylist(
  playlistId: string,
  videoId: string
): Promise<void> {
  const url = `${BASE_URL}/playlistItems?part=snippet`;
  await fetchWithAuth(url, {
    method: "POST",
    body: JSON.stringify({
      snippet: {
        playlistId,
        resourceId: {
          kind: "youtube#video",
          videoId,
        },
      },
    }),
  });
}

/** 재생목록에서 영상 제거 */
export async function removeItemFromPlaylist(
  playlistItemId: string
): Promise<void> {
  const url = `${BASE_URL}/playlistItems?id=${playlistItemId}`;
  await fetchWithAuth(url, { method: "DELETE" });
}