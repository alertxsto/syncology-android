/**
 * TasksTab — Total Redesign 1:1 Desktop Parity
 *
 * Menerapkan:
 * 1. Sticky Header Terkunci (Search input + Mode Switcher List/Calendar + Filter Chips).
 * 2. Menghilangkan 100% bug pergeseran layout pill.
 * 3. Filter Utama: Semua, Tugasku, Review, Usulan, Berjalan, Ghost Pool.
 * 4. Mode Tampilan Kalender (Calendar View).
 * 5. Floating Action Button (+ Usulkan Tugas).
 */

import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {taskApi} from '../../api/tasks';
import {useRealtime} from '../../hooks/useRealtime';
import {useAuthContext} from '../../store/auth';
import {Colors} from '../../theme/colors';
import {Typography} from '../../theme/typography';
import {Spacing, Radius} from '../../theme/spacing';
import type {Room, Member, Task, TaskStatus} from '../../types';
import type {MainStackParamList} from '../../navigation/MainNavigator';

type Nav = NativeStackNavigationProp<MainStackParamList>;

interface Props {
  room: Room;
  role: string;
  members: Member[];
}

type FilterKey = 'all' | 'mine' | 'audit' | 'proposed' | 'todo' | 'pool';

const FILTERS: {key: FilterKey; label: string}[] = [
  {key: 'all', label: 'Semua'},
  {key: 'mine', label: 'Tugasku'},
  {key: 'audit', label: 'Review'},
  {key: 'proposed', label: 'Usulan'},
  {key: 'todo', label: 'Berjalan'},
  {key: 'pool', label: 'Ghost Pool'},
];

const STATUS_LABEL: Record<TaskStatus, string> = {
  proposed: 'Diusulkan',
  todo: 'Berjalan',
  under_review: 'Review',
  completed: 'Selesai',
  disputed: 'Sengketa',
};

const STATUS_COLOR: Record<TaskStatus, string> = {
  proposed: Colors.statusProposed,
  todo: Colors.statusTodo,
  under_review: Colors.statusUnderReview,
  completed: Colors.statusCompleted,
  disputed: Colors.statusDisputed,
};

function TaskCardItem({
  task,
  members,
  onPress,
}: {
  task: Task;
  members: Member[];
  onPress: () => void;
}) {
  const assignee = members.find(m => m.uid === task.assigned_to_id);
  const isOverdue =
    task.status !== 'completed' &&
    task.internal_deadline &&
    new Date(task.internal_deadline) < new Date();

  return (
    <TouchableOpacity
      style={itemStyles.card}
      onPress={onPress}
      activeOpacity={0.8}>
      <View style={itemStyles.topRow}>
        <Text style={itemStyles.title} numberOfLines={2}>
          {task.title}
        </Text>
        <View
          style={[
            itemStyles.statusBadge,
            {backgroundColor: STATUS_COLOR[task.status] + '22'},
          ]}>
          <Text style={[itemStyles.statusLabel, {color: STATUS_COLOR[task.status]}]}>
            {STATUS_LABEL[task.status]}
          </Text>
        </View>
      </View>

      <View style={itemStyles.metaRow}>
        <Text style={itemStyles.assigneeText}>
          👤 {assignee?.display_name ?? (task.assigned_to_id ? task.assigned_to_id.slice(0, 8) : 'Open Pool')}
        </Text>

        <Text style={[itemStyles.deadlineText, isOverdue && {color: Colors.red}]}>
          📅{' '}
          {task.internal_deadline
            ? new Date(task.internal_deadline).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
              })
            : '-'}
        </Text>
      </View>

      <View style={itemStyles.footerRow}>
        <View style={itemStyles.tagGroup}>
          <Text style={itemStyles.diffBadge}>{task.difficulty}</Text>
          <Text style={itemStyles.catBadge}>{task.category}</Text>
        </View>
        <Text style={itemStyles.weightText}>{task.weight} pts</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function TasksTab({room, role, members}: Props) {
  const nav = useNavigation<Nav>();
  const {user} = useAuthContext();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTasks = useCallback(async () => {
    try {
      const data = await taskApi.list(room.id);
      setTasks(data);
    } catch (e) {
      console.error('Gagal memuat task:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [room.id]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useRealtime({roomId: room.id, onTaskChange: loadTasks});

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      // Primary filter chips
      if (filter === 'mine' && t.assigned_to_id !== user?.uid) return false;
      if (filter === 'audit' && t.status !== 'under_review') return false;
      if (filter === 'proposed' && t.status !== 'proposed') return false;
      if (filter === 'todo' && t.status !== 'todo') return false;
      if (filter === 'pool' && t.assigned_to_id !== '') return false;

      // Search
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        return (
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [tasks, filter, search, user?.uid]);

  const myMemberId = members.find(m => m.uid === user?.uid)?.id ?? '';

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.blue} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Sticky Header Section */}
      <View style={styles.stickyHeader}>
        {/* Search Bar & View Mode Switcher */}
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Cari tugas..."
            placeholderTextColor={Colors.text3}
          />
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
              onPress={() => setViewMode('list')}>
              <Text style={[styles.toggleLabel, viewMode === 'list' && styles.toggleLabelActive]}>
                Daftar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'calendar' && styles.toggleBtnActive]}
              onPress={() => setViewMode('calendar')}>
              <Text style={[styles.toggleLabel, viewMode === 'calendar' && styles.toggleLabelActive]}>
                Kalender
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter Chips Horizontal Scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipRow}>
          {FILTERS.map(f => {
            const isActive = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => setFilter(f.key)}>
                <Text style={[styles.chipLabel, isActive && styles.chipLabelActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Propose Action Banner / FAB */}
      {role === 'leader' ? (
        <TouchableOpacity
          style={styles.proposeBar}
          onPress={() =>
            nav.navigate('ProposeTask', {
              roomId: room.id,
              members,
              myUid: user?.uid ?? '',
              myMemberId,
            })
          }>
          <Text style={styles.proposeBarLabel}>+ Usulkan Tugas Baru</Text>
        </TouchableOpacity>
      ) : null}

      {/* Task List / Calendar View */}
      {viewMode === 'list' ? (
        <FlatList
          data={filteredTasks}
          keyExtractor={t => t.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadTasks();
              }}
              tintColor={Colors.blue}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Tidak ada tugas dalam filter ini</Text>
            </View>
          }
          renderItem={({item}) => (
            <TaskCardItem
              task={item}
              members={members}
              onPress={() =>
                nav.navigate('TaskDetail', {
                  task: item,
                  roomId: room.id,
                  role,
                  members,
                })
              }
            />
          )}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.calendarListContent}>
          <Text style={styles.calendarHeaderTitle}>Tampilan Jadwal Deadline</Text>
          {filteredTasks.map(task => (
            <TouchableOpacity
              key={task.id}
              style={itemStyles.card}
              onPress={() =>
                nav.navigate('TaskDetail', {
                  task,
                  roomId: room.id,
                  role,
                  members,
                })
              }>
              <Text style={itemStyles.title}>{task.title}</Text>
              <Text style={itemStyles.deadlineText}>
                Target Deadline:{' '}
                {task.internal_deadline
                  ? new Date(task.internal_deadline).toLocaleDateString('id-ID', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })
                  : 'Tanpa Deadline'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: Colors.bg0},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  stickyHeader: {
    backgroundColor: Colors.bg1,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: Spacing.xs,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    backgroundColor: Colors.bg3,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    color: Colors.text1,
    fontSize: Typography.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.bg3,
    borderRadius: Radius.md,
    padding: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.sm,
  },
  toggleBtnActive: {
    backgroundColor: Colors.blue,
  },
  toggleLabel: {
    fontSize: Typography.xs,
    color: Colors.text3,
    fontWeight: Typography.medium,
  },
  toggleLabelActive: {
    color: Colors.white,
    fontWeight: Typography.bold,
  },
  filterChipRow: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xs,
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
  proposeBar: {
    marginHorizontal: Spacing.base,
    marginTop: Spacing.sm,
    backgroundColor: Colors.blue,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    elevation: 2,
  },
  proposeBarLabel: {
    color: Colors.white,
    fontSize: Typography.base,
    fontWeight: Typography.bold,
  },
  listContent: {
    padding: Spacing.base,
    gap: Spacing.sm,
    paddingBottom: 40,
  },
  calendarListContent: {
    padding: Spacing.base,
    gap: Spacing.sm,
    paddingBottom: 40,
  },
  calendarHeaderTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: Colors.text1,
    marginBottom: Spacing.xs,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: Typography.base,
    color: Colors.text3,
  },
});

const itemStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.xs,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: Colors.text1,
    lineHeight: 22,
  },
  statusBadge: {
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusLabel: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  assigneeText: {
    fontSize: Typography.xs,
    color: Colors.text2,
  },
  deadlineText: {
    fontSize: Typography.xs,
    color: Colors.text3,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  tagGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  diffBadge: {
    fontSize: Typography.xs,
    color: Colors.text3,
    backgroundColor: Colors.bg3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  catBadge: {
    fontSize: Typography.xs,
    color: Colors.text3,
    backgroundColor: Colors.bg3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    textTransform: 'capitalize',
  },
  weightText: {
    fontSize: Typography.xs,
    color: Colors.blueLight,
    fontWeight: Typography.bold,
  },
});
