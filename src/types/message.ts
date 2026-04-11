export type MessageType =
  | "LOGIN"
  | "LOGOUT"
  | "ADD_TO_TEMP_LIST"
  | "REMOVE_FROM_TEMP_LIST"
  | "CLEAR_TEMP_LIST"
  | "GET_TEMP_LIST"
  | "GET_PLAYLISTS"
  | "CREATE_PLAYLIST"
  | "DELETE_PLAYLIST"
  | "ADD_TO_PLAYLIST"
  | "REMOVE_FROM_PLAYLIST";

export interface Message {
  type: MessageType;
  payload?: unknown;
}

export interface MessageResponse {
  success: boolean;
  userId?: string;
  error?: string;
  list?: import("../types").VideoItem[];
  playlists?: import("../background/storage").Playlist[];
  playlist?: import("../background/storage").Playlist;
}