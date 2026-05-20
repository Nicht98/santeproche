import { z } from 'zod';

export const MessageType = z.enum(['text', 'image', 'quick_reply', 'system']);
export type MessageType = z.infer<typeof MessageType>;

export const SendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(2000),
  type: MessageType.default('text'),
});

export type SendMessageInput = z.infer<typeof SendMessageSchema>;
