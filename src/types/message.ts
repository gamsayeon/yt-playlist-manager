export type MessageType =
  | "LOGIN"
  | "LOGOUT"
  | "ADD_TO_TEMP_LIST"
  | "REMOVE_FROM_TEMP_LIST";

export interface Message {
  type: MessageType;
  payload?: unknown;
}

export interface MessageResponse {
  success: boolean;
  userId?: string;
  error?: string;
}