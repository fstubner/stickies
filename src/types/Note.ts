export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
  color?: string;
  pinned?: boolean;
  archived?: boolean;
}
