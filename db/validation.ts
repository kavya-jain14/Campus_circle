import { z } from 'zod';
export const eventInput=z.object({id:z.string().optional(),seed:z.boolean().optional(),name:z.string().max(120).optional(),date:z.string().optional(),venue:z.string().max(120).optional(),category:z.string().optional(),description:z.string().max(2000).optional(),featured:z.number().int().min(0).max(1).optional()});
export const registrationInput=z.object({eventId:z.string(),name:z.string().min(1).max(100),email:z.string().email().max(254),college:z.string().min(1).max(150),year:z.enum(['1','2','3','4','Other']),phone:z.string().regex(/^\+?[\d\s-]{10,16}$/)});
