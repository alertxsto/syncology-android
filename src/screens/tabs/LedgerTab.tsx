/**
 * LedgerTab — Accountability Ledger & Leaderboard (1:1 Desktop Parity)
 *
 * Fitur:
 * - Toggle Switch Mode: Leaderboard (Papan Skor Peringkat) vs Kontribusi (% Kontribusi Tim).
 * - Total Poin Tim & Rincian Tugas Selesai per Anggota.
 * - Indikator Badge: Leader (Biru) & Ghost (Merah untuk member mangkir/tereskalasi).
 * - Chunk Progress Bar & Persentase Kontribusi.
 * - Tap Member Row untuk Navigasi ke Member Profile.
 */

import React, {useState, useEffect, useCallback, useMemo} from 'react';
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
import {memberApi} from '../../api/members';
import {taskApi} from '../../api/tasks';
import {useRealtime} from '../../hooks/useRealtime';
import {Colors} from '../../theme/colors';
import {Typography} from '../../theme/typography';
import {Spacing, Radius} from '../../theme/spacing';
import type {Room, Member, Task} from '../../types';
import type {MainStackParamList} from '../../navigation/MainNavigator';

type Nav = NativeStackNavigationProp<MainStackParamList>;

interface Props {
  room: Room;
  members: Member[];
}

function MedalRank({rank}: {rank: number}) {
  const color =
    rank === 1 ? '#f59e0b' : rank === 2 ? '#94a3b8' : rank === 3 ? '#b45309' : Colors.text3;
  const label = rank === 1 ? '🥇 01' : rank === 2 ? '🥈 02' : rank === 3 ? '🥉 03' : rank < 10 ? `0${rank}` : `${rank}`;

  return (
    <View
      style={[
        medalStyles.medal,
        {backgroundColor: color + '15', borderColor: color + '33'},
      ]}>
      <Text style={[medalStyles.medalText, {color}]}>{label}</Text>
    </View>
  );
}

function ChunkProgressBar({pct, color}: {pct: number; color: string}) {
  return (
    <View style={progressStyles.track}>
      <View
        style={[
          progressStyles.fill,
          {width: `${Math.min(pct, 100)}%` as any, backgroundColor: color},
        ]}
      />
    </View>
  );
}

export default function LedgerTab({room, members: initialMembers}: Props) {
  const nav = useNavigation<Nav>();
  const [viewMode, setViewMode] = useState<'leaderboard' | 'contribution'>('leaderboard');
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [fetchedMembers, fetchedTasks] = await Promise.all([
        memberApi.list(room.id),
        taskApi.list(room.id),
      ]);
      setMembers(fetchedMembers);
      setTasks(fetchedTasks);
    } catch (e) {
      console.error('Gagal memuat ledger data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [room.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useRealtime({
    roomId: room.id,
    onMemberChange: loadData,
    onTaskChange: loadData,
  });

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => (b.total_pts || 0) - (a.total_pts || 0));
  }, [members]);

  const totalTeamPts = useMemo(() => {
    return sortedMembers.reduce((sum, m) => sum + (m.total_pts || 0), 0);
  }, [sortedMembers]);

  // Track ghost members (escalation_level === 3)
  const ghostUids = useMemo(() => {
    return new Set(
      tasks
        .filter(t => (t.escalation_level || 0) === 3 && t.status !== 'completed')
        .map(t => t.assigned_to_id),
    );
  }, [tasks]);

  // Track completed tasks count per member
  const completedTasksByUid = useMemo(() => {
    const map: Record<string, number> = {};
    tasks
      .filter(t => t.status === 'completed')
      .forEach(t => {
        if (t.assigned_to_id) {
          map[t.assigned_to_id] = (map[t.assigned_to_id] || 0) + 1;
        }
      });
    return map;
  }, [tasks]);

  const maxMemberPts = sortedMembers[0]?.total_pts ?? 1;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.blue} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <View style={styles.headerTextGroup}>
          <Text style={styles.headerTitle}>Accountability Ledger</Text>
          <Text style={styles.headerSub}>
            Total: {totalTeamPts} pts · {sortedMembers.length} Anggota Tim
          </Text>
        </View>

        {/* View Mode Toggle Switch */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'leaderboard' && styles.toggleBtnActive]}
            onPress={() => setViewMode('leaderboard')}>
            <Text style={[styles.toggleText, viewMode === 'leaderboard' && styles.toggleTextActive]}>
              Skor
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'contribution' && styles.toggleBtnActive]}
            onPress={() => setViewMode('contribution')}>
            <Text style={[styles.toggleText, viewMode === 'contribution' && styles.toggleTextActive]}>
              % Kontribusi
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Ledger List */}
      <FlatList
        data={sortedMembers}
        keyExtractor={m => m.id}
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
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Belum ada anggota di room ini</Text>
          </View>
        }
        renderItem={({item: m, index}) => {
          const rank = index + 1;
          const isLeader = m.role === 'leader';
          const isGhost = ghostUids.has(m.uid);
          const completedCount = completedTasksByUid[m.uid] || 0;
          const pctContribution =
            totalTeamPts > 0 ? ((m.total_pts || 0) / totalTeamPts) * 100 : 0;

          return (
            <TouchableOpacity
              style={[styles.rowCard, rank === 1 && styles.rowCardTop]}
              onPress={() =>
                nav.navigate('MemberProfile', {
                  uid: m.uid,
                  roomId: room.id,
                  displayName: m.display_name,
                })
              }
              activeOpacity={0.8}>
              {/* Rank Badge */}
              <MedalRank rank={rank} />

              {/* Avatar Initial */}
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {m.display_name.charAt(0).toUpperCase()}
                </Text>
              </View>

              {/* Info Column */}
              <View style={styles.infoCol}>
                <View style={styles.nameRow}>
                  <Text style={styles.memberName} numberOfLines={1}>
                    {m.display_name}
                  </Text>
                  <View style={styles.badgeRow}>
                    {isLeader && (
                      <View style={styles.leaderBadge}>
                        <Text style={styles.leaderBadgeText}>Leader</Text>
                      </View>
                    )}
                    {isGhost && (
                      <View style={styles.ghostBadge}>
                        <Text style={styles.ghostBadgeText}>Ghost</Text>
                      </View>
                    )}
                  </View>
                </View>

                {viewMode === 'leaderboard' ? (
                  <>
                    <ChunkProgressBar
                      pct={(m.total_pts / (maxMemberPts || 1)) * 100}
                      color={rank === 1 ? Colors.yellow : Colors.blue}
                    />
                    <View style={styles.ptsSubRow}>
                      <Text style={styles.ptsValueText}>{m.total_pts || 0} pts</Text>
                      <Text style={styles.subInfoText}>{completedCount} task selesai</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <ChunkProgressBar pct={pctContribution} color={Colors.green} />
                    <View style={styles.ptsSubRow}>
                      <Text style={styles.pctText}>{pctContribution.toFixed(1)}% Kontribusi</Text>
                      <Text style={styles.subInfoText}>{m.total_pts || 0} pts</Text>
                    </View>
                  </>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: Colors.bg0},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  headerBar: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.bg1,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTextGroup: {
    flex: 1,
  },
  headerTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: Colors.text1,
  },
  headerSub: {
    fontSize: Typography.xs,
    color: Colors.text3,
    marginTop: 2,
  },
  toggleContainer: {
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
  toggleText: {
    fontSize: Typography.xs,
    color: Colors.text3,
    fontWeight: Typography.medium,
  },
  toggleTextActive: {
    color: Colors.white,
    fontWeight: Typography.bold,
  },
  listContent: {
    padding: Spacing.base,
    gap: Spacing.sm,
    paddingBottom: 40,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg2,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  rowCardTop: {
    borderColor: 'rgba(234,179,8,0.3)',
    backgroundColor: 'rgba(234,179,8,0.04)',
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.bg3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarText: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: Colors.blueLight,
  },
  infoCol: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberName: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: Colors.text1,
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 4,
  },
  leaderBadge: {
    backgroundColor: 'rgba(59,130,246,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.3)',
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  leaderBadgeText: {
    fontSize: Typography.xs,
    color: Colors.blueLight,
    fontWeight: Typography.semibold,
  },
  ghostBadge: {
    backgroundColor: Colors.redDim,
    borderWidth: 1,
    borderColor: Colors.redBorder,
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  ghostBadgeText: {
    fontSize: Typography.xs,
    color: Colors.red,
    fontWeight: Typography.bold,
  },
  ptsSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  ptsValueText: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: Colors.blueLight,
  },
  pctText: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: Colors.green,
  },
  subInfoText: {
    fontSize: Typography.xs,
    color: Colors.text3,
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

const medalStyles = StyleSheet.create({
  medal: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medalText: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    fontFamily: 'monospace',
  },
});

const progressStyles = StyleSheet.create({
  track: {
    height: 6,
    backgroundColor: Colors.bg3,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.full,
  },
});
