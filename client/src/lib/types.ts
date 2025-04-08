export type MessageHandler = (data: any) => void;

export interface TaskCountData {
  count?: {
    total: number;
    pending?: number;
    completed?: number;
  };
}