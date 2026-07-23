import {supabaseAdmin} from './supabase';
import type {Member, MemberStats} from '../types';

export const memberApi = {
  async list(roomId: string): Promise<Member[]> {
    const {data, error} = await supabaseAdmin
      .from('members')
      .select()
      .eq('room_id', roomId)
      .order('total_pts', {ascending: false});

    if (error) throw new Error(error.message);
    return (data ?? []) as Member[];
  },

  async sendNudge(input: {
    toUid: string;
    taskId: string;
    roomId: string;
    fromUid: string;
    fromName: string;
    taskTitle: string;
  }): Promise<void> {
    // Cek daily limit (maks 3 nudge per hari)
    const {data: member} = await supabaseAdmin
      .from('members')
      .select('nudge_sent_today, nudge_reset_date, id')
      .eq('room_id', input.roomId)
      .eq('uid', input.fromUid)
      .single();

    if (!member) throw new Error('Member tidak ditemukan');

    const today = new Date().toISOString().slice(0, 10);
    const resetDate = member.nudge_reset_date?.slice(0, 10);

    if (resetDate === today && member.nudge_sent_today >= 3) {
      throw new Error('Batas nudge hari ini sudah tercapai (maks 3)');
    }

    // Insert nudge
    const {error: nudgeErr} = await supabaseAdmin.from('nudges').insert({
      room_id: input.roomId,
      from_member_id: member.id,
      from_uid: input.fromUid,
      from_name: input.fromName,
      to_uid: input.toUid,
      task_id: input.taskId,
      task_title: input.taskTitle,
      read: false,
    });

    if (nudgeErr) throw new Error(nudgeErr.message);

    // Update counter
    const newCount =
      resetDate !== today ? 1 : member.nudge_sent_today + 1;

    await supabaseAdmin
      .from('members')
      .update({
        nudge_sent_today: newCount,
        nudge_reset_date: today,
        nudge_pts: (member as any).nudge_pts + 1,
      })
      .eq('id', member.id);

    await supabaseAdmin.from('events').insert({
      room_id: input.roomId,
      actor_uid: input.fromUid,
      actor_name: input.fromName,
      event_type: 'nudge_sent',
      payload: {to_uid: input.toUid, task_id: input.taskId},
    });
  },

  async getStats(roomId: string, uid: string): Promise<MemberStats> {
    const {data: member} = await supabaseAdmin
      .from('members')
      .select()
      .eq('room_id', roomId)
      .eq('uid', uid)
      .single();

    const {data: tasks} = await supabaseAdmin
      .from('tasks')
      .select('status, completed_at, internal_deadline, assigned_to_id')
      .eq('room_id', roomId)
      .eq('assigned_to_id', uid);

    const allTasks = tasks ?? [];
    const completed = allTasks.filter(t => t.status === 'completed').length;
    const assigned = allTasks.length;
    const overdue = allTasks.filter(
      t =>
        t.status !== 'completed' &&
        t.internal_deadline &&
        new Date(t.internal_deadline) < new Date(),
    ).length;

    return {
      uid,
      display_name: member?.display_name ?? '',
      role: member?.role ?? 'member',
      total_pts: member?.total_pts ?? 0,
      tasks_completed: completed,
      tasks_assigned: assigned,
      tasks_overdue: overdue,
      nudges_sent: member?.nudge_pts ?? 0,
      nudges_received: 0,
      rescues: 0,
      reviews_done: 0,
      reviews_pending: 0,
      on_time_rate: assigned > 0 ? (completed / assigned) * 100 : 0,
      weekly_activity: [],
      current_streak: 0,
      longest_streak: 0,
      badges: [],
    } as MemberStats;
  },

  async removeMember(input: {
    roomId: string;
    memberId: string;
    actorUid: string;
    actorName: string;
  }): Promise<void> {
    const {error} = await supabaseAdmin
      .from('members')
      .delete()
      .eq('id', input.memberId)
      .eq('room_id', input.roomId);

    if (error) throw new Error(error.message);

    await supabaseAdmin.from('events').insert({
      room_id: input.roomId,
      actor_uid: input.actorUid,
      actor_name: input.actorName,
      event_type: 'member_removed',
      payload: {member_id: input.memberId},
    });
  },

  async updateRole(input: {
    roomId: string;
    memberId: string;
    newRole: 'leader' | 'member';
    actorUid: string;
    actorName: string;
  }): Promise<void> {
    const {error} = await supabaseAdmin
      .from('members')
      .update({role: input.newRole})
      .eq('id', input.memberId)
      .eq('room_id', input.roomId);

    if (error) throw new Error(error.message);

    await supabaseAdmin.from('events').insert({
      room_id: input.roomId,
      actor_uid: input.actorUid,
      actor_name: input.actorName,
      event_type: 'member_updated',
      payload: {member_id: input.memberId, new_role: input.newRole},
    });
  },

  async callBackup(input: {
    roomId: string;
    taskId: string;
    actorUid: string;
    actorName: string;
    message: string;
  }): Promise<void> {
    const {error} = await supabaseAdmin.from('events').insert({
      room_id: input.roomId,
      actor_uid: input.actorUid,
      actor_name: input.actorName,
      event_type: 'backup_called',
      payload: {task_id: input.taskId, message: input.message},
    });

    if (error) throw new Error(error.message);
  },
};
