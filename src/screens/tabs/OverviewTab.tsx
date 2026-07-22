/**
 * OverviewTab — Redesign 1:1 Desktop Parity
 *
 * Menerapkan:
 * 1. Banner Ringkasan Proyek & Progress Bar Target Deadline.
 * 2. Grid Statistik Poin, Tugas Aktif, Tugas Selesai.
 * 3. Recent Activity Stream Snippet.
 */

import React, {useState, useEffect, useCallback, useMemo} from 'react';
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

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const inProgress = tasks.filter(t => t.status === 'todo').length;
    const underReview = tasks.filter(t => t.status === 'under_review').length;
    const proposed = tasks.filter(t => t.status === 'proposed').length;
    const totalPoints = tasks.reduce((sum, t) => sum + (t.weight || 0), 0);
    const completedPoints = tasks
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + (t.weight || 0), 0);

    return {
      total,
      completed,
      inProgress,
      underReview,
      proposed,
      totalPoints,
      completedPoints,
    };
  }, [tasks]);

  const handlePullRefresh = () => {
    setRefreshing(true);
    onRefresh();
    loadTasks();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.blue} size="large" />
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
          onRefresh={handlePullRefresh}
          tintColor={Colors.blue}
        />
      }>
      {/* Project Status Banner */}
      <View style={styles.banner}>
        <View style={styles.bannerHeader}>
          <Text style={styles.bannerTitle}>{room.project_name}</Text>
          <View style={styles.roomCodeChip}>
            <Text style={styles.roomCodeText}>{room.room_code}</Text>
          </View>
        </View>

        <Text style={styles.bannerSub}>
          Target Deadline:{' '}
          {room.global_deadline
            ? new Date(room.global_deadline).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })
            : 'Tidak Ditetapkan'}
        </Text>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressLabelRow}>
            <Text style={styles.progressLabelText}>Progres Penyelesaian Tugas</Text>
            <Text style={styles.progressPctText}>
              {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
            </Text>
          </View>
          <ProgressBar value={stats.completed} max={stats.total} color={Colors.green} />
        </View>
      </View>

      {/* Grid Stats */}
      <Text style={styles.sectionHeaderTitle}>Statistik Proyek</Text>
      <View style={styles.grid}>
        <StatCard label="Total Tugas" value={stats.total} accent={Colors.blue} />
        <StatCard label="Tugas Selesai" value={stats.completed} accent={Colors.green} />
        <StatCard label="Sedang Berjalan" value={stats.inProgress} accent={Colors.yellow} />
        <StatCard label="Menunggu Review" value={stats.underReview} accent={Colors.indigo} />
      </View>

      {/* Points Card */}
      <View style={styles.pointsCard}>
        <Text style={styles.pointsTitle}>Akumulasi Poin Proyek</Text>
        <Text style={styles.pointsValue}>
          {stats.completedPoints} / {stats.totalPoints} <Text style={styles.pointsUnit}>pts</Text>
        </Text>
        <ProgressBar value={stats.completedPoints} max={stats.totalPoints} color={Colors.blueLight} />
      </View>

      {/* Members Overview */}
      <View style={styles.membersCard}>
        <Text style={styles.membersTitle}>Tim Proyek ({members.length} Anggota)</Text>
        <View style={styles.memberList}>
          {members.map(m => (
            <View key={m.id} style={styles.memberRow}>
              <Text style={styles.memberName}>{m.display_name}</Text>
              <Text style={styles.memberPts}>{m.total_pts ?? 0} pts</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: Colors.bg0},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  content: {padding: Spacing.base, gap: Spacing.base, paddingBottom: 40},
  banner: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.xs,
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.text1,
    flex: 1,
  },
  roomCodeChip: {
    backgroundColor: Colors.bg3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  roomCodeText: {
    fontSize: Typography.xs,
    fontFamily: 'monospace',
    color: Colors.blueLight,
    fontWeight: Typography.semibold,
  },
  bannerSub: {
    fontSize: Typography.xs,
    color: Colors.text3,
  },
  progressContainer: {
    marginTop: Spacing.sm,
    gap: 4,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabelText: {
    fontSize: Typography.xs,
    color: Colors.text2,
  },
  progressPctText: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.green,
  },
  sectionHeaderTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: Colors.text1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  pointsCard: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.xs,
  },
  pointsTitle: {
    fontSize: Typography.xs,
    color: Colors.text3,
    fontWeight: Typography.semibold,
  },
  pointsValue: {
    fontSize: Typography['2xl'],
    fontWeight: Typography.bold,
    color: Colors.text1,
  },
  pointsUnit: {
    fontSize: Typography.base,
    color: Colors.blueLight,
  },
  membersCard: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  membersTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: Colors.text1,
  },
  memberList: {
    gap: 8,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  memberName: {
    fontSize: Typography.sm,
    color: Colors.text1,
  },
  memberPts: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: Colors.blueLight,
  },
});

const statStyles = StyleSheet.create({
  card: {
    width: '47%',
    backgroundColor: Colors.bg2,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  value: {
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    color: Colors.text1,
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
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.full,
  },
});
