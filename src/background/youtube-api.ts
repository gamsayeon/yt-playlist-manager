import { getAuthToken, refreshAuthToken } from "./auth";
import { Playlist } from "./storage";

const BASE_URL = "https://www.googleapis.com/youtube/v3";

export class QuotaExceededError extends Error {
  constructor() {
    super("YouTube API 할당량이 초과되었습니다. 내일 다시 시도해주세요.");
    this.name = "QuotaExceededError";
  }
}

interface YouTubePlaylistItem {
  id: string;
  snippet: {
    title: string;
    description: string;
    publishedAt: string; // ✅ 추가
  };
  contentDetails: {
    itemCount: number;
  };
  status: {
    privacyStatus: string;
  };
}

interface YouTubePlaylistResponse {
  items: YouTubePlaylistItem[];
  nextPageToken?: string;
}

interface YouTubePlaylistSingleResponse {
  id: string;
  snippet: {
    title: string;
    description: string;
    publishedAt?: string;
  };
  contentDetails?: {
    itemCount: number;
  };
  status?: {
    privacyStatus: string;
  };
}

export interface PlaylistItem {
  playlistItemId: string;
  videoId: string;
  title: string;
  thumbnail: string;
}

interface YouTubePlaylistItemResponse {
  id: string;
  snippet: {
    title: string;
    resourceId: {
      videoId: string;
    };
    thumbnails?: {
      default?: { url: string };
      medium?: { url: string };
    };
  };
}

export type PrivacyStatus = "public" | "unlisted" | "private";

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

export async function getPlaylists(): Promise<Playlist[]> {
  const playlists: Playlist[] = [];
  let pageToken: string | undefined;

  do {
    const url = `${BASE_URL}/playlists?part=snippet,contentDetails,status&mine=true&maxResults=50${
      pageToken ? `&pageToken=${pageToken}` : ""
    }`;

    const response = await fetchWithAuth(url);
    const data: YouTubePlaylistResponse = await response.json();

    data.items.forEach((item: YouTubePlaylistItem) => {
      playlists.push({
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        privacyStatus: item.status.privacyStatus,
        itemCount: item.contentDetails.itemCount,
        publishedAt: item.snippet.publishedAt, // ✅ 추가
      });
    });

    pageToken = data.nextPageToken;
  } while (pageToken);

  return playlists;
}

export async function getPlaylistItems(playlistId: string): Promise<PlaylistItem[]> {
  const items: PlaylistItem[] = [];
  let pageToken: string | undefined;

  do {
    const url = `${BASE_URL}/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50${
      pageToken ? `&pageToken=${pageToken}` : ""
    }`;

    const response = await fetchWithAuth(url);
    const data: { items: YouTubePlaylistItemResponse[]; nextPageToken?: string } =
      await response.json();

    data.items.forEach((item: YouTubePlaylistItemResponse) => {
      items.push({
        playlistItemId: item.id,
        videoId: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        thumbnail:
          item.snippet.thumbnails?.medium?.url ??
          item.snippet.thumbnails?.default?.url ??
          `https://i.ytimg.com/vi/${item.snippet.resourceId.videoId}/mqdefault.jpg`,
      });
    });

    pageToken = data.nextPageToken;
  } while (pageToken);

  return items;
}

export async function createPlaylist(
  title: string,
  description: string = "",
  privacyStatus: PrivacyStatus = "private"
): Promise<Playlist> {
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
    description: data.snippet.description,
    privacyStatus: data.status?.privacyStatus ?? "private",
    itemCount: data.contentDetails?.itemCount ?? 0,
    publishedAt: data.snippet.publishedAt ?? new Date().toISOString(), // ✅ 추가
  };
}

export async function updatePlaylist(
  playlistId: string,
  title: string,
  description: string = "",
  privacyStatus: PrivacyStatus = "private"
): Promise<Playlist> {
  const url = `${BASE_URL}/playlists?part=snippet,status,contentDetails`;
  const response = await fetchWithAuth(url, {
    method: "PUT",
    body: JSON.stringify({
      id: playlistId,
      snippet: { title, description },
      status: { privacyStatus },
    }),
  });
  const data: YouTubePlaylistSingleResponse = await response.json();

  return {
    id: data.id,
    title: data.snippet.title,
    description: data.snippet.description,
    privacyStatus: data.status?.privacyStatus ?? privacyStatus,
    itemCount: data.contentDetails?.itemCount ?? 0,
    publishedAt: data.snippet.publishedAt ?? new Date().toISOString(), // ✅ 추가
  };
}

export async function deletePlaylist(playlistId: string): Promise<void> {
  const url = `${BASE_URL}/playlists?id=${playlistId}`;
  await fetchWithAuth(url, { method: "DELETE" });
}

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

export async function removeItemFromPlaylist(
  playlistItemId: string
): Promise<void> {
  const url = `${BASE_URL}/playlistItems?id=${playlistItemId}`;
  await fetchWithAuth(url, { method: "DELETE" });
}