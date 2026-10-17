import { env } from 'cloudflare:workers';
import { verifyAdminSession } from './admin-session.mjs';
export function database(){if(!env.DB)throw new Error('Database unavailable');return env.DB;}
export function password(){return (env as unknown as {ADMIN_PASSWORD?:string}).ADMIN_PASSWORD;}
export async function isAdmin(req:Request){const token=req.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith('admin='))?.slice(6);return verifyAdminSession(token,password());}
export function sameOrigin(req:Request){return req.headers.get('origin')===new URL(req.url).origin;}
