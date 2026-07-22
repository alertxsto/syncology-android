import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack'
import type {RouteProp} from '@react-navigation/native';;
import {taskApi} from '../api/tasks';
import {memberApi} from '../api/members';
import {nudgeApi} from '../api/nudges';
import {useAuthContext} from '../store/auth';
import {Colors} from '../theme/colors';
import {Typography} from '../theme/typography';
import {Spacing, Radius} from '../theme/spacing';
import type {MainStackParamList} from '../navigation/MainNavigator';
import type {Task, TaskStatus, Member} from '../types';

type Nav = NativeStackNavigationProp<MainStackParamList>;
type Route = RouteProp<MainStackParamList, 'TaskDetail'>;

const STATUS_LABEL: Record<TaskStatus, string> = {
  proposed: 'Diusulkan',
  todo: 'Berjalan',
  under_review: 'Menunggu Review',
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

function InfoRow({label, value}: {label: string; value: string}) {
  return (
    <View style={infoStyles.row}>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={infoStyles.value}>{value || '-'}</Text>
    </View>
  );
}

export default function TaskDetailScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const {task: initialTask, roomId, role, members} = route.params;
  const {user} = useAuthContext();

  const [task, setTask] = useState<Task>(initialTask);
  const [loading, setLoading] = useState(false);

  const assignee = members.find((m: Member) => m.uid === task.assigned_to_id);
  const reviewer = members.find((m: Member) => m.uid === task.assigned_reviewer_id);
  const isAssignee = user?.uid === task.assigned_to_id;
  const isReviewer = user?.uid === task.assigned_reviewer_id;
  const isLeader = role === 'leader';

  const canSubmitEvidence =
    isAssignee && (task.status === 'todo' || task.status === 'disputed');

  const canApproveReview = isReviewer && task.status === 'under_review';
  const canApproveProposal = isLeader && task.status === 'proposed';

  const handleApproveProposal = async () => {
    setLoading(true);
    try {
      const reviewerId =
        members.find((m: Member) => m.uid !== task.assigned_to_id && m.role === 'leader')
          ?.uid ?? user?.uid ?? '';

      await taskApi.approve({
        taskId: task.id,
        roomId,
        assignedReviewerId: reviewerId,
        actorUid: user?.uid ?? '',
        actorName: user?.displayName ?? '',
      });

      setTask(prev => ({...prev, status: 'todo', assigned_reviewer_id: reviewerId}));
      Alert.alert('Berhasil', 'Tugas disetujui');
    } catch (e: any) {
      Alert.alert('Gagal', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = () => {
    Alert.prompt(
      'Tolak Usulan',
      'Masukkan alasan penolakan',
      async text => {
        if (!text) return;
        setLoading(true);
        try {
          await taskApi.update(task.id, {status: 'disputed', rejection_reason: text}, roomId);
          setTask(prev => ({...prev, status: 'disputed', rejection_reason: text}));
        } catch (e: any) {
          Alert.alert('Gagal', e.message);
        } finally {
          setLoading(false);
        }
      },
      'plain-text',
    );
  };

  const handleApproveReview = async () => {
    setLoading(true);
    try {
      await taskApi.review({
        taskId: task.id,
        roomId,
        reviewerId: user?.uid ?? '',
        decision: 'approve',
        reason: '',
        actorUid: user?.uid ?? '',
        actorName: user?.displayName ?? '',
      });
      setTask(prev => ({...prev, status: 'completed'}));
      Alert.alert('Berhasil', 'Tugas diselesaikan!');
    } catch (e: any) {
      Alert.alert('Gagal', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectReview = () => {
    Alert.prompt(
      'Tolak Evidence',
      'Masukkan alasan penolakan',
      async text => {
        if (!text) return;
        setLoading(true);
        try {
          await taskApi.review({
            taskId: task.id,
            roomId,
            reviewerId: user?.uid ?? '',
            decision: 'reject',
            reason: text,
            actorUid: user?.uid ?? '',
            actorName: user?.displayName ?? '',
          });
          setTask(prev => ({...prev, status: 'disputed', rejection_reason: text}));
        } catch (e: any) {
          Alert.alert('Gagal', e.message);
        } finally {
          setLoading(false);
        }
      },
      'plain-text',
    );
  };

  const handleNudge = async () => {
    if (!user) return;
    const fromMember = members.find((m: Member) => m.uid === user.uid);
    if (!fromMember) return;
    setLoading(true);
    try {
      await memberApi.sendNudge({
        toUid: task.assigned_to_id,
        taskId: task.id,
        roomId,
        fromUid: user.uid,
        fromName: user.displayName,
        taskTitle: task.title,
      });
      Alert.alert('Berhasil', 'Nudge terkirim!');
    } catch (e: any) {
      Alert.alert('Gagal', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Hapus Tugas',
      'Tugas ini akan dihapus permanen. Lanjutkan?',
      [
        {text: 'Batal', style: 'cancel'},
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await taskApi.delete(task.id, roomId, user?.uid ?? '', user?.displayName ?? '');
              nav.goBack();
            } catch (e: any) {
              Alert.alert('Gagal', e.message);
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg0} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Text style={styles.closeBtn}>Tutup</Text>
        </TouchableOpacity>
        <View style={[styles.statusBadge, {backgroundColor: STATUS_COLOR[task.status] + '22'}]}>
          <Text style={[styles.statusLabel, {color: STATUS_COLOR[task.status]}]}>
            {STATUS_LABEL[task.status]}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{task.title}</Text>

        {task.description ? (
          <Text style={styles.description}>{task.description}</Text>
        ) : null}

        {/* Info grid */}
        <View style={styles.infoBox}>
          <InfoRow label="Ditugaskan ke" value={assignee?.display_name ?? task.assigned_to_id.slice(0, 8)} />
          <InfoRow label="Reviewer" value={reviewer?.display_name ?? (task.assigned_reviewer_id ? task.assigned_reviewer_id.slice(0, 8) : '-')} />
          <InfoRow label="Kesulitan" value={`${task.difficulty} · ${task.weight} pts`} />
          <InfoRow label="Kategori" value={task.category} />
          <InfoRow
            label="Deadline"
            value={
              task.internal_deadline
                ? new Date(task.internal_deadline).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                : '-'
            }
          />
          {task.rejection_reason ? (
            <InfoRow label="Alasan Ditolak" value={task.rejection_reason} />
          ) : null}
        </View>

        {/* Evidence URL */}
        {task.evidence_url ? (
          <View style={styles.evidenceBox}>
            <Text style={styles.evidenceLabel}>Evidence</Text>
            <Text style={styles.evidenceUrl} numberOfLines={3}>
              {task.evidence_url}
            </Text>
          </View>
        ) : null}

        {/* Action buttons */}
        <View style={styles.actions}>
          {canSubmitEvidence && (
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() =>
                nav.navigate('SubmitEvidence', {task, roomId})
              }>
              <Text style={styles.btnPrimaryLabel}>Submit Evidence</Text>
            </TouchableOpacity>
          )}

          {canApproveProposal && (
            <>
              <TouchableOpacity style={styles.btnPrimary} onPress={handleApproveProposal} disabled={loading}>
                <Text style={styles.btnPrimaryLabel}>Setujui Usulan</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnDanger} onPress={handleReject} disabled={loading}>
                <Text style={styles.btnDangerLabel}>Tolak Usulan</Text>
              </TouchableOpacity>
            </>
          )}

          {canApproveReview && (
            <>
              <TouchableOpacity style={styles.btnPrimary} onPress={handleApproveReview} disabled={loading}>
                <Text style={styles.btnPrimaryLabel}>Setujui Evidence</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnDanger} onPress={handleRejectReview} disabled={loading}>
                <Text style={styles.btnDangerLabel}>Tolak Evidence</Text>
              </TouchableOpacity>
            </>
          )}

          {!isAssignee && task.status !== 'completed' && (
            <TouchableOpacity style={styles.btnSecondary} onPress={handleNudge} disabled={loading}>
              <Text style={styles.btnSecondaryLabel}>Kirim Nudge</Text>
            </TouchableOpacity>
          )}

          {isLeader && (
            <TouchableOpacity style={styles.btnDanger} onPress={handleDelete} disabled={loading}>
              <Text style={styles.btnDangerLabel}>Hapus Tugas</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading && (
          <ActivityIndicator color={Colors.blue} style={{marginTop: Spacing.base}} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: Colors.bg1},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeBtn: {
    fontSize: Typography.base,
    color: Colors.blue,
    fontWeight: Typography.medium,
  },
  statusBadge: {
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  statusLabel: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
  },
  content: {padding: Spacing.base, gap: Spacing.base, paddingBottom: 60},
  title: {
    fontSize: Typography['2xl'],
    fontWeight: Typography.bold,
    color: Colors.text1,
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  description: {
    fontSize: Typography.base,
    color: Colors.text2,
    lineHeight: 22,
  },
  infoBox: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.xs,
  },
  evidenceBox: {
    backgroundColor: Colors.bg3,
    borderRadius: Radius.md,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  evidenceLabel: {
    fontSize: Typography.xs,
    color: Colors.text3,
    fontWeight: Typography.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  evidenceUrl: {
    fontSize: Typography.sm,
    color: Colors.blueLight,
    lineHeight: 18,
  },
  actions: {gap: Spacing.sm},
  btnPrimary: {
    backgroundColor: Colors.blue,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  btnPrimaryLabel: {
    color: Colors.white,
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
  },
  btnSecondary: {
    backgroundColor: Colors.bg3,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btnSecondaryLabel: {
    color: Colors.text1,
    fontSize: Typography.base,
    fontWeight: Typography.medium,
  },
  btnDanger: {
    backgroundColor: Colors.redDim,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.redBorder,
  },
  btnDangerLabel: {
    color: Colors.red,
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
  },
});

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 4,
    gap: Spacing.sm,
  },
  label: {
    fontSize: Typography.sm,
    color: Colors.text3,
    width: 120,
    flexShrink: 0,
  },
  value: {
    flex: 1,
    fontSize: Typography.sm,
    color: Colors.text1,
    textAlign: 'right',
  },
});
