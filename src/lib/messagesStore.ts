import "server-only";

import { getJSON, setJSON } from "@/lib/railwayDb";

function genId(): string {
  const c: any = (globalThis as any).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
}

export type ContactMessage = {
  id: string;
  name: string;
  phone?: string | null;
  message: string;
  page?: string | null;
  createdAt: string;
  read?: boolean;
};

const KEY = "messages_v1";
type MessagesDb = { messages: ContactMessage[] };

async function readDb(): Promise<MessagesDb> {
  return await getJSON<MessagesDb>(KEY, { messages: [] });
}

async function writeDb(db: MessagesDb) {
  await setJSON(KEY, db);
}

export async function createMessage(input: Omit<ContactMessage, "id" | "createdAt">): Promise<ContactMessage> {
  const now = new Date().toISOString();
  const id = `msg_${now.replace(/[:.]/g, "-")}_${genId()}`;
  const msg: ContactMessage = { id, createdAt: now, read: false, ...input };
  const db = await readDb();
  db.messages.unshift(msg);
  if (db.messages.length > 5000) db.messages = db.messages.slice(0, 5000);
  await writeDb(db);
  return msg;
}

export async function listMessages(limit: number = 1000): Promise<ContactMessage[]> {
  const db = await readDb();
  return db.messages.slice(0, limit);
}

export async function deleteMessage(id: string): Promise<boolean> {
  const db = await readDb();
  const before = db.messages.length;
  db.messages = db.messages.filter((m) => m.id !== id);
  await writeDb(db);
  return db.messages.length != before;
}

export async function markMessageRead(id: string, read: boolean): Promise<boolean> {
  const db = await readDb();
  const idx = db.messages.findIndex((m) => m.id === id);
  if (idx < 0) return false;
  db.messages[idx] = { ...db.messages[idx], read };
  await writeDb(db);
  return true;
}
