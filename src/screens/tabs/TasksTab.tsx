import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
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

const FILTERS: {key: TaskStatus | 'all'; label: string}[] = [
  {key: 'all', label: 'Semua'},
  {key: 'todo', label: 'Berjalan'},
  {key: 'proposed', label: 'Usulan'},
  {key: 'under_review', label: 'Review'},
  {key: 'completed', label: 'Selesai'},
  {key: 'disputed', label: 'Sengketa'},
];

function TaskItem({
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
    <TouchableOpacity style={itemStyles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={itemStyles.header}>
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
      <View style={itemStyles.meta}>
        <Text style={itemStyles.assignee}>
          {assignee?.display_name ?? task.assigned_to_id.slice(0, 8)}
        </Text>
        <Text style={[itemStyles.deadline, isOverdue && {color: Colors.red}]}>
          {task.internal_deadline
            ? new Date(task.internal_deadline).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
              })
            : '-'}
        </Text>
      </View>
      <View style={itemStyles.footer}>
        <Text style={itemStyles.difficulty}>{task.difficulty}</Text>
        <Text style={itemStyles.weight}>{task.weight} pts</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function TasksTab({room, role, members}: Props) {
  const nav = useNavigation<Nav>();
  const {user} = useAuthContext();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<TaskStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await taskApi.list(room.id);
      setTasks(data);
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

  useRealtime({roomId: room.id, onTaskChange: load});

  const filtered =
    filter === 'all' ? tasks : tasks.filter(t => t.status === filter);

  const myMemberId =
    members.find(m => m.uid === user?.uid)?.id ?? '';

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.blue} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Filter chips */}
      <FlatList
        data={FILTERS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={f => f.key}
        contentContainerStyle={styles.filterRow}
        renderItem={({item: f}) => (
          <TouchableOpacity
            style={[styles.chip, filter === f.key && styles.chipActive]}
            onPress={() => setFilter(f.key)}>
            <Text
              style={[styles.chipLabel, filter === f.key && styles.chipLabelActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Propose button (only leader / anyone can propose based on your flow) */}
      {role === 'leader' ? (
        <TouchableOpacity
          style={styles.proposeFab}
          onPress={() =>
            nav.navigate('ProposeTask', {
              roomId: room.id,
              members,
              myUid: user?.uid ?? '',
              myMemberId,
            })
          }>
          <Text style={styles.fabLabel}>+ Usulkan Tugas</Text>
        </TouchableOpacity>
      ) : null}

      {/* Task list */}
      <FlatList
        data={filtered}
        keyExtractor={t => t.id}
        contentContainerStyle={styles.list}
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
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Tidak ada tugas di filter ini</Text>
          </View>
        }
        renderItem={({item}) => (
          <TaskItem
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: Colors.bg0},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  filterRow: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
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
    fontSize: Typography.sm,
    color: Colors.text2,
    fontWeight: Typography.medium,
  },
  chipLabelActive: {
    color: Colors.blueLight,
  },
  proposeFab: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.blue,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  fabLabel: {
    color: Colors.white,
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
  },
  list: {
    padding: Spacing.base,
    paddingTop: 0,
    gap: Spacing.sm,
    paddingBottom: 40,
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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.text1,
    lineHeight: 20,
  },
  statusBadge: {
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
    flexShrink: 0,
  },
  statusLabel: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  assignee: {
    fontSize: Typography.sm,
    color: Colors.text2,
  },
  deadline: {
    fontSize: Typography.xs,
    color: Colors.text3,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  difficulty: {
    fontSize: Typography.xs,
    color: Colors.text3,
  },
  weight: {
    fontSize: Typography.xs,
    color: Colors.blue,
    fontWeight: Typography.semibold,
  },
});
