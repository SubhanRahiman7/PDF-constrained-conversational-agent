export type TextChunk = {
  id: string;
  page: number;
  text: string;
};

export type SessionDoc = {
  filename: string;
  pageCount: number;
  chunks: TextChunk[];
  createdAt: number;
  expiresAt: number;
};
