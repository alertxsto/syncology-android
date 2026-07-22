/**
 * RoomRealtimeContext — Single Room Realtime Manager.
 *
 * Menerapkan Pub/Sub Event Emitter Pattern untuk 1 room = 1 WebSocket Channel.
 * Mencegah channel collision ("cannot add postgres_changes callbacks after subscribe()")
 * dan mencegah WebSocket disconnect saat switching tab.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import {supabaseAdmin} from '../api/supabase';
import type {RealtimeChannel} from '@supabase/supabase-js';

type Listener = () => void;

interface RoomRealtimeContextValue {
  roomId: string | null;
  subscribeTaskChange: (fn: Listener) => () => void;
  subscribeMessageChange: (fn: Listener) => () => void;
  subscribeNudgeChange: (fn: Listener) => () => void;
  subscribeMemberChange: (fn: Listener) => () => void;
}

const RoomRealtimeContext = createContext<RoomRealtimeContextValue | null>(null);

export function RoomRealtimeProvider({
  roomId,
  children,
}: {
  roomId: string | null;
  children: ReactNode;
}) {
  const taskListenersRef = useRef<Set<Listener>>(new Set());
  const messageListenersRef = useRef<Set<Listener>>(new Set());
  const nudgeListenersRef = useRef<Set<Listener>>(new Set());
  const memberListenersRef = useRef<Set<Listener>>(new Set());
  const channelRef = useRef<RealtimeChannel | null>(null);

  const subscribeTaskChange = useCallback((fn: Listener) => {
    taskListenersRef.current.add(fn);
    return () => {
      taskListenersRef.current.delete(fn);
    };
  }, []);

  const subscribeMessageChange = useCallback((fn: Listener) => {
    messageListenersRef.current.add(fn);
    return () => {
      messageListenersRef.current.delete(fn);
    };
  }, []);

  const subscribeNudgeChange = useCallback((fn: Listener) => {
    nudgeListenersRef.current.add(fn);
    return () => {
      nudgeListenersRef.current.delete(fn);
    };
  }, []);

  const subscribeMemberChange = useCallback((fn: Listener) => {
    memberListenersRef.current.add(fn);
    return () => {
      memberListenersRef.current.delete(fn);
    };
  }, []);

  useEffect(() => {
    if (!roomId) return;

    // Instance ID unik untuk mencegah bentrokan topic jika terjadi remount cepat
    const channelTopic = `room_rt:${roomId}`;
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
          () => {
            taskListenersRef.current.forEach(fn => {
              try {
                fn();
              } catch (e) {
                console.warn('[realtime] task listener error:', e);
              }
            });
          },
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `room_id=eq.${roomId}`,
          },
          () => {
            messageListenersRef.current.forEach(fn => {
              try {
                fn();
              } catch (e) {
                console.warn('[realtime] message listener error:', e);
              }
            });
          },
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'nudges',
            filter: `room_id=eq.${roomId}`,
          },
          () => {
            nudgeListenersRef.current.forEach(fn => {
              try {
                fn();
              } catch (e) {
                console.warn('[realtime] nudge listener error:', e);
              }
            });
          },
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'members',
            filter: `room_id=eq.${roomId}`,
          },
          () => {
            memberListenersRef.current.forEach(fn => {
              try {
                fn();
              } catch (e) {
                console.warn('[realtime] member listener error:', e);
              }
            });
          },
        );

      channel.subscribe(status => {
        if (status === 'SUBSCRIBED') {
          console.log(`[realtime] room:${roomId} subscribed`);
        }
      });

      channelRef.current = channel;
    } catch (e) {
      console.warn('[realtime] setup channel error:', e);
    }

    return () => {
      if (channel) {
        supabaseAdmin.removeChannel(channel).catch(() => {});
        channelRef.current = null;
      }
    };
  }, [roomId]);

  return (
    <RoomRealtimeContext.Provider
      value={{
        roomId,
        subscribeTaskChange,
        subscribeMessageChange,
        subscribeNudgeChange,
        subscribeMemberChange,
      }}>
      {children}
    </RoomRealtimeContext.Provider>
  );
}

export function useRoomRealtimeContext() {
  return useContext(RoomRealtimeContext);
}
