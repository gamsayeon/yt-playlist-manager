import { VideoItem } from "../types";

export class TempList {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  render(list: VideoItem[]): void {
    this.container.innerHTML = "";

    if (list.length === 0) {
      this.container.appendChild(this.createEmptyState());
      return;
    }

    list.forEach((video) => {
      this.container.appendChild(this.createVideoCard(video));
    });
  }

  private createEmptyState(): HTMLElement {
    const empty = document.createElement("p");
    empty.className = "temp-list-empty";
    empty.textContent = "선택된 영상이 없습니다.";
    return empty;
  }

  private createVideoCard(video: VideoItem): HTMLElement {
    const card = document.createElement("div");
    card.className = "video-card";
    card.dataset.videoId = video.videoId;

    // 썸네일
    const thumbnail = document.createElement("img");
    thumbnail.className = "video-thumbnail";
    thumbnail.src = video.thumbnail;
    thumbnail.alt = video.title;
    thumbnail.addEventListener("error", () => {
      thumbnail.src = "";
      thumbnail.alt = "썸네일 없음";
      thumbnail.classList.add("video-thumbnail--error");
    });

    // 제목
    const title = document.createElement("p");
    title.className = "video-title";
    title.textContent = video.title;
    title.title = video.title;

    // 제거 버튼
    const removeBtn = document.createElement("button");
    removeBtn.className = "video-remove-btn";
    removeBtn.textContent = "✕";
    removeBtn.setAttribute("aria-label", `${video.title} 제거`);
    removeBtn.addEventListener("click", () => {
      this.onRemove(video);
    });

    const info = document.createElement("div");
    info.className = "video-info";
    info.appendChild(title);
    info.appendChild(removeBtn);

    card.appendChild(thumbnail);
    card.appendChild(info);

    return card;
  }

  private async onRemove(video: VideoItem): Promise<void> {
    try {
      await chrome.runtime.sendMessage({
        type: "REMOVE_FROM_TEMP_LIST",
        payload: { videoId: video.videoId },
      });
    } catch (error) {
      console.error("[YT Playlist Manager] 제거 실패:", error);
    }
  }
}