/**
 * @jest-environment jsdom
 */
import { parseChannelPlaylistInfo } from "../../../content/checkbox/channel";

function makeHost(playlistId: string, withStack = true): Element {
  const item = document.createElement("yt-lockup-view-model");
  const host = document.createElement("div");
  host.className = `ytLockupViewModelHost${withStack ? " ytLockupViewModelCollectionStack2" : ""} content-id-${playlistId}`;

  const h3 = document.createElement("h3");
  h3.className = "ytLockupMetadataViewModelHeadingReset";
  h3.setAttribute("title", "테스트 재생목록");

  const img = document.createElement("img");
  img.src = "https://example.com/thumb.jpg";
  const thumbViewModel = document.createElement("yt-thumbnail-view-model");
  thumbViewModel.appendChild(img);

  host.appendChild(h3);
  host.appendChild(thumbViewModel);
  item.appendChild(host);
  return item;
}

describe("parseChannelPlaylistInfo", () => {
  it("재생목록 카드 파싱 성공", () => {
    const item = makeHost("PLtest123");
    const result = parseChannelPlaylistInfo(item);
    expect(result).not.toBeNull();
    expect(result?.playlistId).toBe("PLtest123");
    expect(result?.title).toBe("테스트 재생목록");
    expect(result?.thumbnail).toBe("https://example.com/thumb.jpg");
  });

  it("CollectionStack2 없으면 null 반환", () => {
    const item = makeHost("PLtest123", false);
    expect(parseChannelPlaylistInfo(item)).toBeNull();
  });

  it("content-id 클래스 없으면 null 반환", () => {
    const item = document.createElement("yt-lockup-view-model");
    const host = document.createElement("div");
    host.className = "ytLockupViewModelHost ytLockupViewModelCollectionStack2";
    item.appendChild(host);
    expect(parseChannelPlaylistInfo(item)).toBeNull();
  });

  it("host 없으면 null 반환", () => {
    const item = document.createElement("yt-lockup-view-model");
    expect(parseChannelPlaylistInfo(item)).toBeNull();
  });

  it("썸네일 없으면 빈 문자열 반환", () => {
    const item = document.createElement("yt-lockup-view-model");
    const host = document.createElement("div");
    host.className = "ytLockupViewModelHost ytLockupViewModelCollectionStack2 content-id-PLtest";
    item.appendChild(host);
    const result = parseChannelPlaylistInfo(item);
    expect(result?.thumbnail).toBe("");
  });
});