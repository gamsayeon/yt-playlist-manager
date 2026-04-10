export interface VideoInfo {
  videoId: string;
  title: string;
  thumbnail: string;
}

// VideoInfo와 동일 구조 - background에서 사용
export type VideoItem = VideoInfo;