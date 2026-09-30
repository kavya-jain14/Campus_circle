import { env } from 'cloudflare:workers';
export function database(){if(!env.DB)throw new Error('Database unavailable');return env.DB;}
export function password(){return (env as unknown as {ADMIN_PASSWORD?:string}).ADMIN_PASSWORD;}
export async function isAdmin(req:Request){const secret=password(); if(!secret)return false;const token=req.headers.get('cookie')?.split('; ').find(v=>v.startsWith('admin='))?.slice(6);const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(secret));return token===Array.from(new Uint8Array(hash)).map(v=>v.toString(16).padStart(2,'0')).join('');}
export function sameOrigin(req:Request){return req.headers.get('origin')===new URL(req.url).origin;}
