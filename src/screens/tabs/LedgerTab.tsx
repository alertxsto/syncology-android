import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {memberApi} from '../../api/members';
import {useRealtime} from '../../hooks/useRealtime';
import {Colors} from '../../theme/colors';
import {Typography} from '../../theme/typography';
import {Spacing, Radius} from '../../theme/spacing';
import type {Room, Member} from '../../types';

interface Props {
  room: Room;
  members: Member[];
}

function MedalIcon({rank}: {rank: number}) {
  const color =
    rank === 1 ? '#f59e0b' : rank === 2 ? '#94a3b8' : rank === 3 ? '#b45309' : Colors.text3;
  return (
    <View
      style={[
        medalStyles.medal,
        {backgroundColor: color + '22', borderColor: color + '44'},
      ]}>
      <Text style={[medalStyles.medalText, {color}]}>
        {rank <= 3 ? ['1', '2', '3'][rank - 1] : `${rank}`}
      </Text>
    </View>
  );
}

function ProgressBar({pts, max}: {pts: number; max: number}) {
  const pct = max > 0 ? Math.min((pts / max) * 100, 100) : 0;
  return (
    <View style={progressStyles.track}>
      <View style={[progressStyles.fill, {width: `${pct}%` as any}]} />
    </View>
  );
}

export default function LedgerTab({room, members}: Props) {
  const [sorted, setSorted] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await memberApi.list(room.id);
      setSorted([...data].sort((a, b) => b.total_pts - a.total_pts));
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

  useRealtime({roomId: room.id, onMemberChange: load});

  const maxPts = sorted[0]?.total_pts ?? 1;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.blue} />
      </View>
    );
  }

  return (
    <FlatList
      data={sorted}
      keyExtractor={m => m.id}
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
        <View style={styles.header}>
          <Text style={styles.title}>Papan Skor</Text>
          <Text style={styles.sub}>{room.project_name}</Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Belum ada anggota</Text>
        </View>
      }
      renderItem={({item: m, index}) => (
        <View style={styles.row}>
          <MedalIcon rank={index + 1} />
          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{m.display_name}</Text>
              <View
                style={[
                  styles.roleBadge,
                  m.role === 'leader' && styles.roleBadgeLeader,
                ]}>
                <Text style={styles.roleLabel}>{m.role}</Text>
              </View>
            </View>
            <ProgressBar pts={m.total_pts} max={maxPts} />
            <View style={styles.ptsRow}>
              <Text style={styles.pts}>{m.total_pts} pts</Text>
              <Text style={styles.nudgePts}>
                {m.nudge_pts > 0 ? `+${m.nudge_pts} nudge` : ''}
              </Text>
            </View>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  content: {padding: Spacing.base, gap: Spacing.sm, paddingBottom: 40},
  header: {marginBottom: Spacing.base},
  title: {
    fontSize: Typography['2xl'],
    fontWeight: Typography.bold,
    color: Colors.text1,
    letterSpacing: -0.5,
  },
  sub: {fontSize: Typography.sm, color: Colors.text3},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.bg2,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  info: {flex: 1, gap: 6},
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.text1,
  },
  roleBadge: {
    backgroundColor: Colors.bg4,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  roleBadgeLeader: {
    backgroundColor: 'rgba(59,130,246,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.3)',
  },
  roleLabel: {fontSize: Typography.xs, color: Colors.text2},
  ptsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pts: {
    fontSize: Typography.md,
    fontWeight: Typography.bold,
    color: Colors.blue,
    letterSpacing: -0.3,
  },
  nudgePts: {fontSize: Typography.xs, color: Colors.text3},
  empty: {alignItems: 'center', paddingTop: 60},
  emptyText: {fontSize: Typography.base, color: Colors.text3},
});

const medalStyles = StyleSheet.create({
  medal: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  medalText: {fontSize: Typography.sm, fontWeight: Typography.bold},
});

const progressStyles = StyleSheet.create({
  track: {
    height: 6,
    backgroundColor: Colors.bg4,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: Colors.blue,
    borderRadius: 3,
  },
});
