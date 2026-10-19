// Modo servidor (Cloudflare Workers): la base es D1. astro.config elige este archivo o fuente-demo.ts como '#fuente'.
import { env } from 'cloudflare:workers';
import type { DB } from './db.ts';

export const getDB = async (): Promise<DB> => env.DB as unknown as DB;
export const getEnv = async () => env as { SESSION_SECRET?: string; LOGIN_LIMIT?: { limit(o: { key: string }): Promise<{ success: boolean }> } };
