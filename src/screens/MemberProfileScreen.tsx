import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack'
import type {RouteProp} from '@react-navigation/native';;
import {memberApi} from '../api/members';
import {Colors} from '../theme/colors';
import {Typography} from '../theme/typography';
import {Spacing, Radius} from '../theme/spacing';
import type {MainStackParamList} from '../navigation/MainNavigator';
import type {MemberStats} from '../types';

type Nav = NativeStackNavigationProp<MainStackParamList>;
type Route = RouteProp<MainStackParamList, 'MemberProfile'>;

function StatBox({label, value}: {label: string; value: string | number}) {
  return (
    <View style={statStyles.box}>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

function ProgressBar({value, max, color}: {value: number; max: number; color: string}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <View style={pbStyles.track}>
      <View style={[pbStyles.fill, {width: `${pct}%` as any, backgroundColor: color}]} />
    </View>
  );
}

export default function MemberProfileScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const {uid, roomId, displayName} = route.params;

  const [stats, setStats] = useState<MemberStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await memberApi.getStats(roomId, uid);
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [roomId, uid]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg1} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <Text style={styles.closeBtn}>Tutup</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil Anggota</Text>
        <View style={{width: 48}} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.blue} />
        </View>
      ) : !stats ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Gagal memuat data profil</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Avatar + name */}
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.name}>{stats.display_name}</Text>
            <View style={[styles.roleBadge, stats.role === 'leader' && styles.roleBadgeLeader]}>
              <Text style={styles.roleLabel}>{stats.role}</Text>
            </View>
            <Text style={styles.totalPts}>{stats.total_pts} pts total</Text>
          </View>

          {/* Stat grid */}
          <View style={styles.statGrid}>
            <StatBox label="Selesai" value={stats.tasks_completed} />
            <StatBox label="Ditugaskan" value={stats.tasks_assigned} />
            <StatBox label="Terlambat" value={stats.tasks_overdue} />
            <StatBox label="Nudge Dikirim" value={stats.nudges_sent} />
          </View>

          {/* On-time rate */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Tingkat Ketepatan Waktu</Text>
              <Text style={styles.sectionValue}>
                {Math.round(stats.on_time_rate)}%
              </Text>
            </View>
            <ProgressBar value={stats.on_time_rate} max={100} color={Colors.green} />
          </View>

          {/* Streak */}
          {(stats.current_streak > 0 || stats.longest_streak > 0) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Streak</Text>
              <View style={styles.statGrid}>
                <StatBox label="Streak Sekarang" value={`${stats.current_streak}d`} />
                <StatBox label="Streak Terpanjang" value={`${stats.longest_streak}d`} />
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: Colors.bg1},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeBtn: {color: Colors.blue, fontSize: Typography.base},
  headerTitle: {
    fontSize: Typography.md,
    fontWeight: Typography.semibold,
    color: Colors.text1,
  },
  content: {padding: Spacing.base, gap: Spacing.xl, paddingBottom: 60},
  profileHeader: {alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xl},
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(59,130,246,0.2)',
    borderWidth: 2,
    borderColor: Colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: Typography['3xl'],
    fontWeight: Typography.bold,
    color: Colors.blueLight,
  },
  name: {
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    color: Colors.text1,
    letterSpacing: -0.3,
  },
  roleBadge: {
    backgroundColor: Colors.bg3,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  roleBadgeLeader: {
    backgroundColor: 'rgba(59,130,246,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.3)',
  },
  roleLabel: {fontSize: Typography.sm, color: Colors.text2},
  totalPts: {
    fontSize: Typography['2xl'],
    fontWeight: Typography.extrabold,
    color: Colors.blue,
    letterSpacing: -0.5,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  section: {gap: Spacing.sm},
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.text1,
  },
  sectionValue: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.green,
  },
  errorText: {fontSize: Typography.base, color: Colors.text3},
});

const statStyles = StyleSheet.create({
  box: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.md,
    padding: Spacing.base,
    width: '48%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  value: {
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    color: Colors.text1,
    letterSpacing: -0.3,
  },
  label: {fontSize: Typography.xs, color: Colors.text3, marginTop: 2},
});

const pbStyles = StyleSheet.create({
  track: {
    height: 8,
    backgroundColor: Colors.bg3,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {height: '100%', borderRadius: 4},
});
