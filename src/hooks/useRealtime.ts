/**
 * useRealtime — Supabase Realtime subscriptions per room.
 *
 * Menggantikan useRoomWatcher dari versi desktop.
 * Subscribe ke perubahan tasks, messages, dan nudges secara realtime.
 */

import {useEffect, useRef, useCallback} from 'react';
import {supabaseAdmin} from '../api/supabase';
import type {RealtimeChannel} from '@supabase/supabase-js';

interface UseRealtimeOptions {
  roomId: string | null;
  onTaskChange?: () => void;
  onMessageChange?: () => void;
  onNudgeChange?: () => void;
  onMemberChange?: () => void;
}

export function useRealtime({
  roomId,
  onTaskChange,
  onMessageChange,
  onNudgeChange,
  onMemberChange,
}: UseRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  const setupChannel = useCallback(() => {
    if (!roomId) return;

    // Bersihkan channel lama
    if (channelRef.current) {
      supabaseAdmin.removeChannel(channelRef.current);
    }

    const channel = supabaseAdmin
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `room_id=eq.${roomId}`,
        },
        () => onTaskChange?.(),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        () => onMessageChange?.(),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'nudges',
          filter: `room_id=eq.${roomId}`,
        },
        () => onNudgeChange?.(),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'members',
          filter: `room_id=eq.${roomId}`,
        },
        () => onMemberChange?.(),
      )
      .subscribe();

    channelRef.current = channel;
  }, [roomId, onTaskChange, onMessageChange, onNudgeChange, onMemberChange]);

  useEffect(() => {
    setupChannel();
    return () => {
      if (channelRef.current) {
        supabaseAdmin.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [setupChannel]);
}
