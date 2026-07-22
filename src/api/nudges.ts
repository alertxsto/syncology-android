import {supabaseAdmin} from './supabase';
import type {Nudge} from '../types';

export const nudgeApi = {
  async list(roomId: string): Promise<Nudge[]> {
    const {data, error} = await supabaseAdmin
      .from('nudges')
      .select()
      .eq('room_id', roomId)
      .order('created_at', {ascending: false})
      .limit(50);

    if (error) throw new Error(error.message);

    return (data ?? []).map(row => ({
      id: row.id,
      from_member_id: row.from_member_id,
      from_uid: row.from_uid,
      from_name: row.from_name,
      to_uid: row.to_uid,
      task_id: row.task_id,
      task_title: row.task_title,
      timestamp: row.created_at,
      read: row.read,
    })) as Nudge[];
  },

  async markRead(nudgeId: string): Promise<void> {
    await supabaseAdmin
      .from('nudges')
      .update({read: true})
      .eq('id', nudgeId);
  },

  async markAllRead(roomId: string, uid: string): Promise<void> {
    await supabaseAdmin
      .from('nudges')
      .update({read: true})
      .eq('room_id', roomId)
      .eq('to_uid', uid)
      .eq('read', false);
  },
};
