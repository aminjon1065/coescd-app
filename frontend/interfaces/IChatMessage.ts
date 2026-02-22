export interface IChatMessage {
  id: number;
  room: string;
  sender: {
    id: number;
    name: string;
    avatar: string | null;
  } | null;
  content: string;
  createdAt: string;
}

export interface IChatHistoryResponse {
  items: IChatMessage[];
  total: number;
  page: number;
  limit: number;
}
