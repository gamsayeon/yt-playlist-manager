const manifest = {
  manifest_version: 3,
  name: "YT Playlist Manager",
  version: "0.1.0",
  description: "YouTube 영상을 체크박스로 다중 선택하여 재생목록을 일괄 관리합니다.",

  permissions: ["identity", "storage", "sidePanel"],

  host_permissions: [
    "https://www.youtube.com/*",
    "https://www.googleapis.com/*",
  ],

  oauth2: {
    client_id: "",
    scopes: ["https://www.googleapis.com/auth/youtube"],
  },

  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },

  content_scripts: [
    {
      matches: ["https://www.youtube.com/*"],
      js: ["src/content/index.ts"],
      run_at: "document_idle",
    },
  ],

  side_panel: {
    default_path: "src/sidepanel/index.html",
  },

  action: {
    default_title: "YT Playlist Manager",
  },
} as const;

export default manifest;