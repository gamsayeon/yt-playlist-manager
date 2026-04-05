export type MessageType = "LOGIN" | "LOGOUT";

export interface Message {
  type: MessageType;
}

export interface MessageResponse {
  success: boolean;
  userId?: string;
  error?: string;
}