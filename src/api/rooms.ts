/**
 * Rooms API — port dari Rust commands ke Supabase REST langsung.
 */

import {supabaseAdmin} from './supabase';
import type {Room, ActivityEvent} from '../types';

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export const roomApi = {
  async create(input: {
    projectName: string;
    globalDeadline: string | null;
    externalChatUrl: string | null;
    uid: string;
    displayName: string;
  }): Promise<Room> {
    const roomCode = generateRoomCode();

    const {data: room, error: roomErr} = await supabaseAdmin
      .from('rooms')
      .insert({
        room_code: roomCode,
        project_name: input.projectName,
        global_deadline: input.globalDeadline || null,
        external_chat_url: input.externalChatUrl || '',
        is_active: true,
      })
      .select()
      .single();

    if (roomErr) throw new Error(roomErr.message);

    // Tambahkan creator sebagai leader
    const {error: memberErr} = await supabaseAdmin.from('members').insert({
      room_id: room.id,
      uid: input.uid,
      display_name: input.displayName,
      role: 'leader',
    });

    if (memberErr) throw new Error(memberErr.message);

    // Log event
    await supabaseAdmin.from('events').insert({
      room_id: room.id,
      actor_uid: input.uid,
      actor_name: input.displayName,
      event_type: 'room_created',
      payload: {project_name: input.projectName, room_code: roomCode},
    });

    return {...room, my_role: 'leader'} as Room;
  },

  async join(input: {
    roomCode: string;
    uid: string;
    displayName: string;
  }): Promise<Room> {
    const {data: room, error: roomErr} = await supabaseAdmin
      .from('rooms')
      .select()
      .eq('room_code', input.roomCode.toUpperCase())
      .eq('is_active', true)
      .single();

    if (roomErr || !room) throw new Error('Room tidak ditemukan atau sudah berakhir');

    // Cek sudah jadi member atau belum
    const {data: existing} = await supabaseAdmin
      .from('members')
      .select()
      .eq('room_id', room.id)
      .eq('uid', input.uid)
      .maybeSingle();

    if (!existing) {
      await supabaseAdmin.from('members').insert({
        room_id: room.id,
        uid: input.uid,
        display_name: input.displayName,
        role: 'member',
      });

      await supabaseAdmin.from('events').insert({
        room_id: room.id,
        actor_uid: input.uid,
        actor_name: input.displayName,
        event_type: 'member_joined',
        payload: {},
      });
    }

    return {...room, my_role: existing?.role ?? 'member'} as Room;
  },

  async listMyRooms(uid: string): Promise<Room[]> {
    // Ambil semua member record milik user ini
    const {data: memberRows, error: mErr} = await supabaseAdmin
      .from('members')
      .select('room_id, role, id')
      .eq('uid', uid);

    if (mErr) throw new Error(mErr.message);
    if (!memberRows || memberRows.length === 0) return [];

    const roomIds = memberRows.map(m => m.room_id);

    const {data: rooms, error: rErr} = await supabaseAdmin
      .from('rooms')
      .select()
      .in('id', roomIds)
      .order('created_at', {ascending: false});

    if (rErr) throw new Error(rErr.message);

    return (rooms ?? []).map(r => {
      const memberRow = memberRows.find(m => m.room_id === r.id);
      return {
        ...r,
        my_role: memberRow?.role ?? 'member',
        my_member_id: memberRow?.id ?? '',
      } as Room;
    });
  },

  async update(input: {
    roomId: string;
    projectName: string;
    globalDeadline: string;
    externalChatUrl: string;
    uid: string;
    displayName: string;
  }): Promise<void> {
    const {error} = await supabaseAdmin
      .from('rooms')
      .update({
        project_name: input.projectName,
        global_deadline: input.globalDeadline || null,
        external_chat_url: input.externalChatUrl,
      })
      .eq('id', input.roomId);

    if (error) throw new Error(error.message);

    await supabaseAdmin.from('events').insert({
      room_id: input.roomId,
      actor_uid: input.uid,
      actor_name: input.displayName,
      event_type: 'room_updated',
      payload: {project_name: input.projectName},
    });
  },

  async end(input: {
    roomId: string;
    uid: string;
    displayName: string;
  }): Promise<void> {
    const {error} = await supabaseAdmin
      .from('rooms')
      .update({is_active: false, archived_at: new Date().toISOString()})
      .eq('id', input.roomId);

    if (error) throw new Error(error.message);

    await supabaseAdmin.from('events').insert({
      room_id: input.roomId,
      actor_uid: input.uid,
      actor_name: input.displayName,
      event_type: 'room_ended',
      payload: {},
    });
  },

  async getEvents(
    roomId: string,
    limit: number = 50,
  ): Promise<ActivityEvent[]> {
    const {data, error} = await supabaseAdmin
      .from('events')
      .select()
      .eq('room_id', roomId)
      .order('created_at', {ascending: false})
      .limit(limit);

    if (error) throw new Error(error.message);

    return (data ?? []).map(row => ({
      id: row.id,
      actor_uid: row.actor_uid,
      actor_name: row.actor_name,
      event_type: row.event_type,
      payload: row.payload,
      timestamp: row.created_at,
    })) as ActivityEvent[];
  },
};
