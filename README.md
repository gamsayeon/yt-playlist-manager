# yt-playlist-manager

YouTube 검색·홈 화면에서 영상을 체크박스로 일괄 선택하고, 선택된 영상을 기반으로 재생목록을 빠르게 생성·수정·삭제할 수 있는 Chrome Extension입니다.

---

## 배경

YouTube에서 여러 영상을 하나의 재생목록에 담으려면 영상마다 개별로 조작해야 합니다.
이 확장 프로그램은 썸네일에 체크박스를 추가해 여러 영상을 한 번에 선택하고, Side Panel에서 재생목록을 일괄 관리할 수 있게 합니다.

---

## 주요 기능

- 썸네일 우상단 체크박스로 영상 다중 선택
- Side Panel에서 선택된 영상 목록 실시간 확인 (썸네일 + 제목)
- 선택 목록 기반 재생목록 일괄 생성
- 기존 재생목록에 선택 영상 일괄 추가
- 재생목록 내 영상 개별 제거
- 재생목록 삭제

---

## 기술 스택

| 항목 | 기술 |
|---|---|
| Extension 규격 | Chrome Manifest V3 |
| 언어 | TypeScript |
| 번들러 | Vite + vite-plugin-web-extension |
| 저장소 | chrome.storage.local |
| 인증 | chrome.identity (OAuth 2.0) |
| 외부 API | YouTube Data API v3 |
| 테스트 | Jest + jest-chrome |
| 패키지 매니저 | pnpm |

---

## 아키텍처

```
[YouTube 페이지]
    ↑ Content Script (체크박스 DOM 삽입 / MutationObserver)
    │
    ↕ chrome.runtime.sendMessage
    │
[Service Worker]
    ├── YouTube API 호출
    ├── chrome.storage.local 관리
    └── chrome.identity OAuth 토큰
    │
    ↕ chrome.storage.onChanged
    │
[Side Panel]
    └── 임시 리스트 UI / 재생목록 관리 UI
```

**리소스 최적화 전략**

- Content Script는 MutationObserver + throttle로 YouTube SPA 페이지 변경을 최소한의 CPU로 감지
- 영상 정보(videoId, title, thumbnail)는 YouTube DOM에서 직접 파싱 — `search.list` API 호출 없음
- 재생목록 목록은 `chrome.storage.local`에 캐싱, CRUD 이후에만 갱신
- Service Worker는 이벤트 없으면 자동 종료 (Manifest V3 특성 활용)

---

## YouTube Data API Quota 사용 범위

| 호출 API | 유닛 | 시점 |
|---|---|---|
| `playlists.list` | 1 | Side Panel 열 때 (캐싱 적용) |
| `playlists.insert` | 50 | 재생목록 생성 |
| `playlists.update` | 50 | 재생목록 수정 |
| `playlists.delete` | 50 | 재생목록 삭제 |
| `playlistItems.insert` | 50 | 영상 추가 (영상 수만큼) |
| `playlistItems.delete` | 50 | 영상 제거 |
| `search.list` | 100 | **미사용** — DOM 파싱으로 대체 |

일일 기본 할당량 10,000 유닛 기준으로 개인 사용 환경에서 초과 가능성 없음.

---

## 개발 환경 설정

### 사전 준비

- Node.js 18 이상
- pnpm
- Google Cloud Console에서 YouTube Data API v3 활성화 및 OAuth 2.0 Client ID 발급

### 설치

```bash
git clone https://github.com/{username}/yt-playlist-manager.git
cd yt-playlist-manager
pnpm install
```

### 환경변수 설정

```bash
cp .env.example .env
# .env 파일에 발급받은 값 입력
```

```env
VITE_OAUTH_CLIENT_ID=your_client_id.apps.googleusercontent.com
```

### 개발 빌드

```bash
pnpm dev
# dist/ 폴더 생성됨
```

### Chrome에 로드

```
1. Chrome 브라우저에서 chrome://extensions 접속
2. 우상단 "개발자 모드" 활성화
3. "압축해제된 확장 프로그램을 로드합니다" 클릭
4. dist/ 폴더 선택
5. YouTube(https://www.youtube.com) 접속 후 동작 확인
```

### 프로덕션 빌드

```bash
pnpm build
# dist/ 폴더를 zip으로 압축하면 배포 가능
```

### 테스트

```bash
pnpm test
pnpm test:watch   # watch 모드
```

---

## 개발 방식

### GitHub Flow

```
main ← 항상 동작하는 안정 브랜치
  └── feature/{issue-number}-{기능명}
  └── fix/{issue-number}-{버그명}
  └── refactor/{issue-number}-{대상}
```

- `main` 직접 push 금지
- 모든 작업: Issue 생성 → Branch → PR → Merge
- PR 머지 조건: CI(빌드 + 테스트) 통과

### 커밋 메시지 규칙

```
feat: 썸네일 체크박스 삽입 구현 (#3)
fix: YouTube SPA 이동 시 체크박스 중복 삽입 (#7)
refactor: 메시지 핸들러 타입 가드 적용 (#12)
test: youtube-api 클라이언트 단위 테스트 추가 (#15)
docs: README 설치 가이드 업데이트
```

---

## 코드 컨벤션

Wiki 참고 → [Code Convention](../../wiki/Code-Convention)

---

## 라이선스

MIT
