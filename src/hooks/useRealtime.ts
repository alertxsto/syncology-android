/**
 * useRealtime — Supabase Realtime subscriptions hook.
 *
 * Menggunakan RoomRealtimeContext jika berada di dalam RoomRealtimeProvider,
 * atau Topic Isolation Fallback (rt:${roomId}:${instanceId}) jika di luar provider.
 * 100% bebas dari "cannot add postgres_changes callbacks after subscribe()".
 */

import {useEffect, useRef} from 'react';
import {supabaseAdmin} from '../api/supabase';
import {useRoomRealtimeContext} from '../store/RoomRealtimeContext';
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
  const roomContext = useRoomRealtimeContext();

  // Simpan callback terkini di ref agar perubahan fungsi callback tidak mere-trigger effect
  const callbacksRef = useRef({
    onTaskChange,
    onMessageChange,
    onNudgeChange,
    onMemberChange,
  });

  useEffect(() => {
    callbacksRef.current = {
      onTaskChange,
      onMessageChange,
      onNudgeChange,
      onMemberChange,
    };
  });

  // Unique instance ID untuk fallback mode
  const instanceIdRef = useRef(
    Math.random().toString(36).substring(2, 9),
  );
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!roomId) return;

    // JIKA BERADA DI DALAM RoomRealtimeProvider — gunakan Pub/Sub Context (Paling Efisien)
    if (roomContext && roomContext.roomId === roomId) {
      const unsubTask = roomContext.subscribeTaskChange(() => {
        callbacksRef.current.onTaskChange?.();
      });
      const unsubMessage = roomContext.subscribeMessageChange(() => {
        callbacksRef.current.onMessageChange?.();
      });
      const unsubNudge = roomContext.subscribeNudgeChange(() => {
        callbacksRef.current.onNudgeChange?.();
      });
      const unsubMember = roomContext.subscribeMemberChange(() => {
        callbacksRef.current.onMemberChange?.();
      });

      return () => {
        unsubTask();
        unsubMessage();
        unsubNudge();
        unsubMember();
      };
    }

    // FALLBACK MODE (Jika dipakai di luar RoomRealtimeProvider) — gunakan Isolated Unique Channel Topic
    const channelTopic = `rt_iso:${roomId}:${instanceIdRef.current}`;
    let channel: RealtimeChannel | null = null;

    try {
      channel = supabaseAdmin
        .channel(channelTopic)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tasks',
            filter: `room_id=eq.${roomId}`,
          },
          () => callbacksRef.current.onTaskChange?.(),
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `room_id=eq.${roomId}`,
          },
          () => callbacksRef.current.onMessageChange?.(),
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'nudges',
            filter: `room_id=eq.${roomId}`,
          },
          () => callbacksRef.current.onNudgeChange?.(),
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'members',
            filter: `room_id=eq.${roomId}`,
          },
          () => callbacksRef.current.onMemberChange?.(),
        );

      channel.subscribe();
      channelRef.current = channel;
    } catch (e) {
      console.warn('[useRealtime] fallback setup error:', e);
    }

    return () => {
      if (channel) {
        supabaseAdmin.removeChannel(channel).catch(() => {});
        channelRef.current = null;
      }
    };
  }, [roomId, roomContext]);
}
