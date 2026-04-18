export interface VideoInfo {
  videoId: string;
  title: string;
  thumbnail: string;
  playlistId?: string; // ✅ 재생목록 소속 영상 식별용
}

export type VideoItem = VideoInfo;