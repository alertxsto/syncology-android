/**
 * Tasks API — port dari Rust commands ke Supabase REST.
 */

import {supabaseAdmin} from './supabase';
import type {Task, TaskDifficulty, TaskComment, TaskSubtask} from '../types';

const DIFFICULTY_WEIGHT: Record<TaskDifficulty, number> = {
  Easy: 5,
  Medium: 10,
  Hard: 20,
  'Very Hard': 35,
};

export const taskApi = {
  async list(roomId: string): Promise<Task[]> {
    const {data, error} = await supabaseAdmin
      .from('tasks')
      .select()
      .eq('room_id', roomId)
      .order('proposed_at', {ascending: false});

    if (error) throw new Error(error.message);
    return (data ?? []) as Task[];
  },

  async add(input: {
    title: string;
    description: string;
    assignedToId: string;
    difficulty: TaskDifficulty;
    category?: 'technical' | 'management';
    internalDeadline: string;
    roomId: string;
    proposedById: string;
    proposerName: string;
    proposerUid: string;
  }): Promise<string> {
    const weight = DIFFICULTY_WEIGHT[input.difficulty];

    const {data, error} = await supabaseAdmin
      .from('tasks')
      .insert({
        room_id: input.roomId,
        title: input.title,
        description: input.description,
        assigned_to_id: input.assignedToId,
        proposed_by_id: input.proposedById,
        weight,
        difficulty: input.difficulty,
        category: input.category ?? 'technical',
        status: 'proposed',
        internal_deadline: input.internalDeadline,
      })
      .select('id')
      .single();

    if (error) throw new Error(error.message);

    await supabaseAdmin.from('events').insert({
      room_id: input.roomId,
      actor_uid: input.proposerUid,
      actor_name: input.proposerName,
      event_type: 'task_proposed',
      payload: {task_id: data.id, title: input.title},
    });

    return data.id;
  },

  async update(
    taskId: string,
    data: Partial<Task>,
    roomId: string,
  ): Promise<void> {
    const {error} = await supabaseAdmin
      .from('tasks')
      .update(data)
      .eq('id', taskId)
      .eq('room_id', roomId);

    if (error) throw new Error(error.message);
  },

  async delete(
    taskId: string,
    roomId: string,
    actorUid: string,
    actorName: string,
  ): Promise<void> {
    const {error} = await supabaseAdmin
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('room_id', roomId);

    if (error) throw new Error(error.message);

    await supabaseAdmin.from('events').insert({
      room_id: roomId,
      actor_uid: actorUid,
      actor_name: actorName,
      event_type: 'task_deleted',
      payload: {task_id: taskId},
    });
  },

  async submitEvidence(input: {
    taskId: string;
    evidenceUrl: string;
    roomId: string;
    actorUid: string;
    actorName: string;
    notes?: string;
  }): Promise<void> {
    const {error} = await supabaseAdmin
      .from('tasks')
      .update({
        status: 'under_review',
        evidence_url: input.evidenceUrl,
        submitted_at: new Date().toISOString(),
      })
      .eq('id', input.taskId)
      .eq('room_id', input.roomId);

    if (error) throw new Error(error.message);

    await supabaseAdmin.from('events').insert({
      room_id: input.roomId,
      actor_uid: input.actorUid,
      actor_name: input.actorName,
      event_type: 'evidence_submitted',
      payload: {task_id: input.taskId, evidence_url: input.evidenceUrl},
    });
  },

  async review(input: {
    taskId: string;
    roomId: string;
    reviewerId: string;
    decision: 'approve' | 'reject';
    reason: string;
    actorUid: string;
    actorName: string;
  }): Promise<void> {
    const isApproved = input.decision === 'approve';

    // Get task untuk ambil weight dan assigned_to_id
    const {data: task} = await supabaseAdmin
      .from('tasks')
      .select('weight, assigned_to_id')
      .eq('id', input.taskId)
      .single();

    const updatePayload: Partial<Task> = isApproved
      ? {
          status: 'completed',
          approved_by_id: input.reviewerId,
          rejection_reason: '',
          approved_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        }
      : {
          status: 'todo',
          rejection_reason: input.reason,
        };

    const {error} = await supabaseAdmin
      .from('tasks')
      .update(updatePayload)
      .eq('id', input.taskId)
      .eq('room_id', input.roomId);

    if (error) throw new Error(error.message);

    // Tambah poin kalau approved
    if (isApproved && task) {
      await supabaseAdmin
        .from('members')
        .update({
          total_pts: supabaseAdmin.rpc as any, // Will use increment via raw
        })
        .eq('room_id', input.roomId)
        .eq('uid', task.assigned_to_id);

      // Pakai RPC increment
      await supabaseAdmin.rpc('increment_member_pts', {
        p_room_id: input.roomId,
        p_uid: task.assigned_to_id,
        p_pts: task.weight,
      });
    }

    await supabaseAdmin.from('events').insert({
      room_id: input.roomId,
      actor_uid: input.actorUid,
      actor_name: input.actorName,
      event_type: isApproved ? 'task_approved' : 'task_rejected',
      payload: {task_id: input.taskId, reason: input.reason},
    });
  },

  async giveKudos(input: {
    taskId: string;
    giverUid: string;
    roomId: string;
  }): Promise<void> {
    const {data: task} = await supabaseAdmin
      .from('tasks')
      .select('kudos_by, kudos_count')
      .eq('id', input.taskId)
      .single();

    if (!task) return;
    const already = (task.kudos_by ?? []).includes(input.giverUid);
    if (already) return;

    await supabaseAdmin
      .from('tasks')
      .update({
        kudos_by: [...(task.kudos_by ?? []), input.giverUid],
        kudos_count: (task.kudos_count ?? 0) + 1,
      })
      .eq('id', input.taskId);
  },

  async getComments(taskId: string, roomId: string): Promise<TaskComment[]> {
    const {data, error} = await supabaseAdmin
      .from('task_comments')
      .select()
      .eq('task_id', taskId)
      .eq('room_id', roomId)
      .order('created_at', {ascending: true});

    if (error) throw new Error(error.message);
    return (data ?? []).map(row => ({
      id: row.id,
      author_uid: row.author_uid,
      author_name: row.author_name,
      comment_text: row.comment_text,
      timestamp: row.created_at,
    })) as TaskComment[];
  },

  async addComment(
    taskId: string,
    roomId: string,
    text: string,
    authorUid: string,
    authorName: string,
  ): Promise<void> {
    const {error} = await supabaseAdmin.from('task_comments').insert({
      task_id: taskId,
      room_id: roomId,
      author_uid: authorUid,
      author_name: authorName,
      comment_text: text,
    });

    if (error) throw new Error(error.message);
  },

  async approve(input: {
    taskId: string;
    roomId: string;
    assignedReviewerId: string;
    actorUid: string;
    actorName: string;
  }): Promise<void> {
    const {error} = await supabaseAdmin
      .from('tasks')
      .update({
        status: 'todo',
        assigned_reviewer_id: input.assignedReviewerId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', input.taskId)
      .eq('room_id', input.roomId);

    if (error) throw new Error(error.message);

    await supabaseAdmin.from('events').insert({
      room_id: input.roomId,
      actor_uid: input.actorUid,
      actor_name: input.actorName,
      event_type: 'task_approved',
      payload: {task_id: input.taskId},
    });
  },

  async updateSubtasks(
    taskId: string,
    roomId: string,
    subtasks: TaskSubtask[],
  ): Promise<void> {
    const {error} = await supabaseAdmin
      .from('tasks')
      .update({subtasks})
      .eq('id', taskId)
      .eq('room_id', roomId);

    if (error) throw new Error(error.message);
  },
};
