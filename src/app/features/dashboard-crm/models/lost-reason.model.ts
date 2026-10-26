export interface LostReason {
  id: number | null;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export function emptyLostReason(): LostReason {
  return { id: null, name: '', description: '', active: true, createdAt: null, updatedAt: null };
}