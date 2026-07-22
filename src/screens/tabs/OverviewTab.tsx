import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {taskApi} from '../../api/tasks';
import {Colors} from '../../theme/colors';
import {Typography} from '../../theme/typography';
import {Spacing, Radius} from '../../theme/spacing';
import {useRealtime} from '../../hooks/useRealtime';
import type {Room, Member, Task} from '../../types';

interface Props {
  room: Room;
  role: string;
  members: Member[];
  onRefresh: () => void;
}

function StatCard({label, value, accent}: {label: string; value: string | number; accent?: string}) {
  return (
    <View style={[statStyles.card, accent ? {borderLeftColor: accent, borderLeftWidth: 3} : null]}>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

function ProgressBar({value, max, color}: {value: number; max: number; color: string}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <View style={progressStyles.track}>
      <View style={[progressStyles.fill, {width: `${pct}%` as any, backgroundColor: color}]} />
    </View>
  );
}

export default function OverviewTab({room, role, members, onRefresh}: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTasks = useCallback(async () => {
    try {
      const data = await taskApi.list(room.id);
      setTasks(data);
    } catch (e) {
      console.error('Gagal load tasks overview:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [room.id]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useRealtime({roomId: room.id, onTaskChange: loadTasks});

  const totalTasks = tasks.length;
  const completed = tasks.filter(t => t.status === 'completed').length;
  const todo = tasks.filter(t => t.status === 'todo').length;
  const proposed = tasks.filter(t => t.status === 'proposed').length;
  const underReview = tasks.filter(t => t.status === 'under_review').length;
  const disputed = tasks.filter(t => t.status === 'disputed').length;
  const progress = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

  const now = new Date();
  const overdue = tasks.filter(
    t =>
      t.status !== 'completed' &&
      t.internal_deadline &&
      new Date(t.internal_deadline) < now,
  ).length;

  const topMembers = [...members]
    .sort((a, b) => b.total_pts - a.total_pts)
    .slice(0, 5);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.blue} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadTasks();
            onRefresh();
          }}
          tintColor={Colors.blue}
        />
      }>

      {/* Deadline banner */}
      {room.global_deadline ? (
        <View style={styles.deadlineBanner}>
          <Text style={styles.deadlineLabel}>Deadline Project</Text>
          <Text style={styles.deadlineDate}>
            {new Date(room.global_deadline).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </View>
      ) : null}

      {/* Progress */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Progress Keseluruhan</Text>
          <Text style={styles.progressPct}>{progress}%</Text>
        </View>
        <ProgressBar value={completed} max={totalTasks} color={Colors.green} />
        <Text style={styles.progressSub}>
          {completed} dari {totalTasks} tugas selesai
        </Text>
      </View>

      {/* Stat grid */}
      <View style={styles.statGrid}>
        <StatCard label="Selesai" value={completed} accent={Colors.green} />
        <StatCard label="Berjalan" value={todo} accent={Colors.blue} />
        <StatCard label="Menunggu Review" value={underReview} accent={Colors.yellow} />
        <StatCard label="Diusulkan" value={proposed} accent={Colors.indigo} />
        <StatCard label="Terlambat" value={overdue} accent={Colors.red} />
        <StatCard label="Sengketa" value={disputed} accent={Colors.orange} />
      </View>

      {/* Leaderboard */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Leaderboard</Text>
        {topMembers.map((m, idx) => (
          <View key={m.id} style={styles.leaderRow}>
            <Text style={styles.rank}>#{idx + 1}</Text>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{m.display_name}</Text>
              <Text style={styles.memberRole}>{m.role}</Text>
            </View>
            <Text style={styles.pts}>{m.total_pts} pts</Text>
          </View>
        ))}
        {members.length === 0 && (
          <Text style={styles.empty}>Belum ada anggota</Text>
        )}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: Colors.bg0},
  content: {padding: Spacing.base, gap: Spacing.xl, paddingBottom: 40},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  deadlineBanner: {
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderRadius: Radius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deadlineLabel: {fontSize: Typography.sm, color: Colors.text2},
  deadlineDate: {fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.blueLight},
  section: {gap: Spacing.sm},
  sectionHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  sectionTitle: {fontSize: Typography.md, fontWeight: Typography.semibold, color: Colors.text1},
  progressPct: {fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.green},
  progressSub: {fontSize: Typography.sm, color: Colors.text3},
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rank: {fontSize: Typography.sm, color: Colors.text3, width: 24},
  memberInfo: {flex: 1},
  memberName: {fontSize: Typography.base, fontWeight: Typography.medium, color: Colors.text1},
  memberRole: {fontSize: Typography.xs, color: Colors.text3},
  pts: {fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.blue},
  empty: {fontSize: Typography.sm, color: Colors.text3, textAlign: 'center', padding: Spacing.xl},
});

const statStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.md,
    padding: Spacing.base,
    width: '48%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  value: {
    fontSize: Typography['2xl'],
    fontWeight: Typography.bold,
    color: Colors.text1,
    letterSpacing: -0.5,
  },
  label: {
    fontSize: Typography.xs,
    color: Colors.text3,
    marginTop: 2,
  },
});

const progressStyles = StyleSheet.create({
  track: {
    height: 8,
    backgroundColor: Colors.bg3,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});
