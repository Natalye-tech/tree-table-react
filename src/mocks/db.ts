import { Collection } from '@msw/data';
import { z } from 'zod';

export const templateSchema = z.object({
  idTemplate: z.number(),
  nameTemplate: z.string(),
  idGroup: z.number(),
  nameGroup: z.string(),
  status: z.number().nullable(),
  dateCreate: z.string(),
});

export type TemplateRecord = z.infer<typeof templateSchema>;

export const templates = new Collection({ schema: templateSchema });