import {supabaseAdmin} from './supabase';
import type {ChatMessage} from '../types';

export const chatApi = {
  async list(roomId: string): Promise<ChatMessage[]> {
    const {data, error} = await supabaseAdmin
      .from('messages')
      .select()
      .eq('room_id', roomId)
      .order('created_at', {ascending: true})
      .limit(200);

    if (error) throw new Error(error.message);

    return (data ?? []).map(row => ({
      id: row.id,
      sender_id: row.sender_id,
      sender_name: row.sender_name,
      message_body: row.message_body,
      timestamp: row.created_at,
      edited: row.edited,
      reply_to: row.reply_to,
      reactions: row.reactions,
    })) as ChatMessage[];
  },

  async send(
    roomId: string,
    body: string,
    senderUid: string,
    senderName: string,
    replyTo?: string,
  ): Promise<void> {
    const {error} = await supabaseAdmin.from('messages').insert({
      room_id: roomId,
      sender_id: senderUid,
      sender_name: senderName,
      message_body: body,
      reply_to: replyTo ?? null,
    });

    if (error) throw new Error(error.message);
  },

  async edit(
    roomId: string,
    messageId: string,
    body: string,
  ): Promise<void> {
    const {error} = await supabaseAdmin
      .from('messages')
      .update({
        message_body: body,
        edited: true,
        edited_at: new Date().toISOString(),
      })
      .eq('id', messageId)
      .eq('room_id', roomId);

    if (error) throw new Error(error.message);
  },

  async react(
    roomId: string,
    messageId: string,
    emoji: string,
    uid: string,
  ): Promise<void> {
    const {data: msg} = await supabaseAdmin
      .from('messages')
      .select('reactions')
      .eq('id', messageId)
      .single();

    if (!msg) return;

    const reactions: Record<string, string[]> = msg.reactions ?? {};
    const users = reactions[emoji] ?? [];
    const idx = users.indexOf(uid);

    if (idx >= 0) {
      users.splice(idx, 1);
    } else {
      users.push(uid);
    }

    if (users.length === 0) {
      delete reactions[emoji];
    } else {
      reactions[emoji] = users;
    }

    await supabaseAdmin
      .from('messages')
      .update({reactions})
      .eq('id', messageId);
  },
};
