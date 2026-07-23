/**
 * ActivityTab — Activity Log & Audit Stream (1:1 Desktop Parity)
 *
 * Fitur:
 * - Category Filter Chips: Semua, Task, Member, Nudge, Room.
 * - Dropdown Filter Pelaku (Actor Filter) & Tipe Event.
 * - Pengelompokan Log berdasarkan Header Hari/Tanggal (Day Grouping).
 * - Rich Snippets dari payload event.
 * - Live Realtime Update dengan useRealtime hook.
 */

import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {roomApi} from '../../api/rooms';
import {memberApi} from '../../api/members';
import {useRealtime} from '../../hooks/useRealtime';
import {Colors} from '../../theme/colors';
import {Typography} from '../../theme/typography';
import {Spacing, Radius} from '../../theme/spacing';
import type {Room, ActivityEvent, EventType, Member} from '../../types';

interface Props {
  room: Room;
}

const CATEGORY_FILTERS = [
  {id: 'all', label: 'Semua'},
  {id: 'task', label: 'Task'},
  {id: 'member', label: 'Member'},
  {id: 'nudge', label: 'Nudge'},
  {id: 'room', label: 'Room'},
];

const EVENT_META: Record<EventType, {label: string; icon: string; color: string}> = {
  room_created: {label: 'Room dibuat', icon: '🎯', color: Colors.blue},
  room_updated: {label: 'Room diupdate', icon: '✏️', color: Colors.blue},
  room_ended: {label: 'Room diakhiri', icon: '🛑', color: Colors.text3},
  member_joined: {label: 'Anggota bergabung', icon: '👤', color: Colors.green},
  member_rejoined: {label: 'Anggota kembali', icon: '🔄', color: Colors.green},
  member_removed: {label: 'Anggota dikeluarkan', icon: '🚪', color: Colors.red},
  task_proposed: {label: 'Task diusulkan', icon: '📄', color: Colors.indigo},
  task_approved: {label: 'Task disetujui', icon: '✅', color: Colors.green},
  task_rejected: {label: 'Task ditolak', icon: '❌', color: Colors.red},
  task_rescued: {label: 'Task di-rescue', icon: '⚡', color: Colors.yellow},
  task_updated: {label: 'Task diupdate', icon: '✏️', color: Colors.blueLight},
  task_deleted: {label: 'Task dihapus', icon: '🗑️', color: Colors.red},
  evidence_submitted: {label: 'Bukti dikirim', icon: '📎', color: Colors.yellow},
  nudge_sent: {label: 'Nudge terkirim', icon: '🔔', color: Colors.orange},
  kudos_sent: {label: 'Kudos diberikan', icon: '⭐', color: '#a855f7'},
  backup_called: {label: 'Bantuan diminta', icon: '🚨', color: Colors.red},
};

export default function ActivityTab({room}: Props) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedActorUid, setSelectedActorUid] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [fetchedEvents, fetchedMembers] = await Promise.all([
        roomApi.getEvents(room.id, 200),
        memberApi.list(room.id),
      ]);
      setEvents(fetchedEvents);
      setMembers(fetchedMembers);
    } catch (e) {
      console.error('Gagal load activity events:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [room.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Live Realtime listener untuk auto-update event log
  useRealtime({
    roomId: room.id,
    onTaskChange: loadData,
    onMessageChange: loadData,
    onNudgeChange: loadData,
    onMemberChange: loadData,
  });

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      // 1. Filter Kategori Tab
      if (categoryFilter !== 'all') {
        if (!e.event_type.startsWith(categoryFilter)) return false;
      }
      // 2. Filter Actor
      if (selectedActorUid && e.actor_uid !== selectedActorUid) return false;

      return true;
    });
  }, [events, categoryFilter, selectedActorUid]);

  // Group events by day header
  const groupedDays = useMemo(() => {
    const groups: Record<string, ActivityEvent[]> = {};
    filteredEvents.forEach(e => {
      const dayStr = (e.timestamp || '').substring(0, 10);
      if (!groups[dayStr]) groups[dayStr] = [];
      groups[dayStr].push(e);
    });

    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map(dayStr => ({
        dayStr,
        displayDate: dayStr
          ? new Date(dayStr).toLocaleDateString('id-ID', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })
          : 'Aktivitas Terkini',
        items: groups[dayStr],
      }));
  }, [filteredEvents]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.blue} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Category Filter Chips Bar */}
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}>
          {CATEGORY_FILTERS.map(f => {
            const isActive = categoryFilter === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => setCategoryFilter(f.id)}>
                <Text style={[styles.chipLabel, isActive && styles.chipLabelActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Actor Quick Selector Row */}
        {members.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.actorChipRow}>
            <TouchableOpacity
              style={[
                styles.actorChip,
                !selectedActorUid && styles.actorChipActive,
              ]}
              onPress={() => setSelectedActorUid('')}>
              <Text
                style={[
                  styles.actorChipText,
                  !selectedActorUid && styles.actorChipTextActive,
                ]}>
                Semua Pelaku
              </Text>
            </TouchableOpacity>

            {members.map(m => {
              const isActive = selectedActorUid === m.uid;
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.actorChip, isActive && styles.actorChipActive]}
                  onPress={() =>
                    setSelectedActorUid(isActive ? '' : m.uid)
                  }>
                  <Text
                    style={[
                      styles.actorChipText,
                      isActive && styles.actorChipTextActive,
                    ]}>
                    👤 {m.display_name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Grouped Day Stream */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor={Colors.blue}
          />
        }>
        {groupedDays.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📥</Text>
            <Text style={styles.emptyTitle}>Belum ada aktivitas</Text>
            <Text style={styles.emptySub}>
              Aktivitas room akan muncul di sini secara real-time!
            </Text>
          </View>
        ) : (
          groupedDays.map(group => (
            <View key={group.dayStr} style={styles.dayGroup}>
              {/* Day Header */}
              <View style={styles.dayHeader}>
                <Text style={styles.dayHeaderText}>{group.displayDate}</Text>
                <Text style={styles.dayHeaderCount}>
                  {group.items.length} aktivitas
                </Text>
              </View>

              {/* Event Items */}
              {group.items.map(e => {
                const meta = EVENT_META[e.event_type] ?? {
                  label: e.event_type.replace(/_/g, ' '),
                  icon: '•',
                  color: Colors.text3,
                };
                const payload = e.payload || {};

                // Format Rich Snippet
                let snippet = '';
                if (e.event_type === 'nudge_sent') {
                  const targetMember = members.find(m => m.uid === payload.to_uid);
                  snippet = `kepada ${targetMember?.display_name || 'Anggota'} untuk tugas "${payload.task_title || 'tugas'}"`;
                } else if (e.event_type === 'evidence_submitted') {
                  snippet = `untuk tugas "${payload.task_id?.substring(0, 6) || 'tugas'}"`;
                } else if (e.event_type.startsWith('task_')) {
                  snippet = `"${payload.title || payload.task_id?.substring(0, 6) || 'tugas'}"`;
                } else if (e.event_type === 'backup_called') {
                  snippet = `"${payload.message || 'butuh bantuan'}"`;
                }

                const timeStr = new Date(e.timestamp).toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <View key={e.id} style={styles.eventRow}>
                    <View style={[styles.iconWrap, {backgroundColor: meta.color + '22'}]}>
                      <Text style={styles.iconText}>{meta.icon}</Text>
                    </View>

                    <View style={styles.eventInfo}>
                      <View style={styles.lineRow}>
                        <Text style={styles.actorName}>{e.actor_name}</Text>
                        <Text style={styles.actionText}>{meta.label}</Text>
                      </View>

                      {snippet ? (
                        <View style={styles.snippetBox}>
                          <Text style={styles.snippetText} numberOfLines={2}>
                            {snippet}
                          </Text>
                        </View>
                      ) : null}

                      <Text style={styles.timeText}>{timeStr}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: Colors.bg0},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  filterBar: {
    backgroundColor: Colors.bg1,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  chipRow: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.bg3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: 'rgba(59,130,246,0.15)',
    borderColor: Colors.blue,
  },
  chipLabel: {
    fontSize: Typography.xs,
    color: Colors.text2,
    fontWeight: Typography.medium,
  },
  chipLabelActive: {
    color: Colors.blueLight,
    fontWeight: Typography.bold,
  },
  actorChipRow: {
    paddingHorizontal: Spacing.base,
    gap: 6,
  },
  actorChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    backgroundColor: Colors.bg2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actorChipActive: {
    backgroundColor: Colors.bg4,
    borderColor: Colors.blueLight,
  },
  actorChipText: {
    fontSize: Typography.xs,
    color: Colors.text3,
  },
  actorChipTextActive: {
    color: Colors.text1,
    fontWeight: Typography.semibold,
  },
  listContent: {
    padding: Spacing.base,
    gap: Spacing.md,
    paddingBottom: 40,
  },
  dayGroup: {
    gap: Spacing.xs,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dayHeaderText: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.text2,
  },
  dayHeaderCount: {
    fontSize: Typography.xs,
    color: Colors.text3,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.bg2,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
    marginVertical: 2,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconText: {
    fontSize: 16,
  },
  eventInfo: {
    flex: 1,
    gap: 2,
  },
  lineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  actorName: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: Colors.text1,
  },
  actionText: {
    fontSize: Typography.sm,
    color: Colors.text2,
  },
  snippetBox: {
    backgroundColor: Colors.bg3,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 2,
  },
  snippetText: {
    fontSize: Typography.xs,
    color: Colors.blueLight,
    fontStyle: 'italic',
  },
  timeText: {
    fontSize: 10,
    color: Colors.text3,
    marginTop: 2,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: Spacing.xs,
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.text1,
  },
  emptySub: {
    fontSize: Typography.sm,
    color: Colors.text3,
    textAlign: 'center',
  },
});
