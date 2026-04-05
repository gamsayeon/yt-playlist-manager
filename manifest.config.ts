const manifest = {
  manifest_version: 3,
  name: "YT Playlist Manager",
  version: "0.0.1",
  description: "YouTube 영상을 체크박스로 선택해 재생목록을 일괄 관리하는 확장 프로그램",

  permissions: ["storage", "identity", "sidePanel"],

  host_permissions: ["https://www.youtube.com/*"],

  oauth2: {
    client_id: process.env.VITE_OAUTH_CLIENT_ID || "",
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
    },
  ],

  side_panel: {
    default_path: "src/sidepanel/index.html",
  },

  action: {
    default_title: "YT Playlist Manager",
  },
};

export default manifest;