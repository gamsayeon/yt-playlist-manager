import { VideoItem } from "../types";

const PLACEHOLDER_SRC =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

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

    const clearBtn = this.createClearButton();
    this.container.appendChild(clearBtn);

    list.forEach((video) => {
      this.container.appendChild(this.createVideoCard(video));
    });
  }

  private createEmptyState(): HTMLElement {
    const empty = document.createElement("div");
    empty.className = "temp-list-empty";
    const message = document.createElement("p");
    message.textContent = "선택된 영상이 없습니다.";
    empty.appendChild(message);
    return empty;
  }

  private createClearButton(): HTMLElement {
    const clearBtn = document.createElement("button");
    clearBtn.className = "temp-list-clear-btn";
    clearBtn.textContent = "전체 초기화";
    clearBtn.addEventListener("click", () => {
      this.onClear();
    });
    return clearBtn;
  }

  private createVideoCard(video: VideoItem): HTMLElement {
    const card = document.createElement("div");
    card.className = "video-card";
    card.dataset.videoId = video.videoId;

    const thumbnail = document.createElement("img");
    thumbnail.className = "video-thumbnail";
    thumbnail.alt = video.title;
    thumbnail.addEventListener("error", () => {
      thumbnail.src = PLACEHOLDER_SRC;
      thumbnail.classList.add("video-thumbnail--error");
    });
    thumbnail.src = video.thumbnail;

    const title = document.createElement("p");
    title.className = "video-title";
    title.textContent = video.title;
    title.title = video.title;

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

  private async onClear(): Promise<void> {
    try {
      await chrome.runtime.sendMessage({ type: "CLEAR_TEMP_LIST" });
    } catch (error) {
      console.error("[YT Playlist Manager] 초기화 실패:", error);
    }
  }
}