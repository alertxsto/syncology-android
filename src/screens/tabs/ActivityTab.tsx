import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {roomApi} from '../../api/rooms';
import {useRealtime} from '../../hooks/useRealtime';
import {Colors} from '../../theme/colors';
import {Typography} from '../../theme/typography';
import {Spacing, Radius} from '../../theme/spacing';
import type {Room, ActivityEvent, EventType} from '../../types';

interface Props {
  room: Room;
}

const EVENT_ICON: Partial<Record<EventType, string>> = {
  room_created: 'R',
  room_updated: 'R',
  room_ended: 'X',
  member_joined: 'M',
  member_removed: 'M',
  task_proposed: 'T',
  task_approved: 'T',
  task_rejected: 'T',
  task_rescued: 'T',
  task_deleted: 'T',
  evidence_submitted: 'E',
  nudge_sent: 'N',
  kudos_sent: 'K',
  backup_called: 'B',
};

const EVENT_COLOR: Partial<Record<EventType, string>> = {
  room_created: Colors.blue,
  room_ended: Colors.red,
  member_joined: Colors.green,
  member_removed: Colors.red,
  task_approved: Colors.green,
  task_rejected: Colors.red,
  task_proposed: Colors.indigo,
  evidence_submitted: Colors.yellow,
  nudge_sent: Colors.orange,
  kudos_sent: '#a855f7',
};

function formatEventLabel(type: EventType): string {
  return type.replace(/_/g, ' ');
}

function EventRow({event}: {event: ActivityEvent}) {
  const icon = EVENT_ICON[event.event_type] ?? '?';
  const color = EVENT_COLOR[event.event_type] ?? Colors.text3;
  const time = new Date(event.timestamp).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={rowStyles.row}>
      <View style={[rowStyles.iconWrap, {backgroundColor: color + '22'}]}>
        <Text style={[rowStyles.icon, {color}]}>{icon}</Text>
      </View>
      <View style={rowStyles.info}>
        <Text style={rowStyles.actor}>{event.actor_name}</Text>
        <Text style={rowStyles.type}>{formatEventLabel(event.event_type)}</Text>
        {event.payload?.title ? (
          <Text style={rowStyles.detail} numberOfLines={1}>
            {event.payload.title}
          </Text>
        ) : null}
      </View>
      <Text style={rowStyles.time}>{time}</Text>
    </View>
  );
}

export default function ActivityTab({room}: Props) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await roomApi.getEvents(room.id, 80);
      setEvents(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [room.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Tidak ada realtime subscription untuk events — cukup pull-to-refresh

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.blue} />
      </View>
    );
  }

  return (
    <FlatList
      data={events}
      keyExtractor={e => e.id}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={Colors.blue}
        />
      }
      ListHeaderComponent={
        <Text style={styles.header}>Riwayat Aktivitas</Text>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Belum ada aktivitas</Text>
        </View>
      }
      renderItem={({item}) => <EventRow event={item} />}
    />
  );
}

const styles = StyleSheet.create({
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  content: {padding: Spacing.base, gap: 1, paddingBottom: 40},
  header: {
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    color: Colors.text1,
    letterSpacing: -0.3,
    marginBottom: Spacing.base,
  },
  empty: {alignItems: 'center', paddingTop: 60},
  emptyText: {fontSize: Typography.base, color: Colors.text3},
});

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  icon: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
  },
  info: {flex: 1},
  actor: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.text1,
  },
  type: {
    fontSize: Typography.xs,
    color: Colors.text2,
    textTransform: 'capitalize',
  },
  detail: {
    fontSize: Typography.xs,
    color: Colors.text3,
    fontStyle: 'italic',
  },
  time: {
    fontSize: 10,
    color: Colors.text3,
    flexShrink: 0,
  },
});
