/**
 * TaskDetailScreen — Redesign 1:1 Desktop Parity
 *
 * Menerapkan:
 * 1. Subtasks Interactive Checklist (Tambah & toggle subtask).
 * 2. Diskusi & Komentar Realtime per Task.
 * 3. Kudos Button (Apresiasi tugas).
 * 4. Alur Kerja Setujui/Tolak Usulan & Evidence.
 */

import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Linking,
  Image,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import {taskApi} from '../api/tasks';
import {memberApi} from '../api/members';
import {useAuthContext} from '../store/auth';
import {Colors} from '../theme/colors';
import {Typography} from '../theme/typography';
import {Spacing, Radius} from '../theme/spacing';
import type {MainStackParamList} from '../navigation/MainNavigator';
import type {Task, TaskStatus, Member, TaskComment, TaskSubtask} from '../types';
import {ImageViewerModal} from '../components/ImageViewerModal';

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
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);

  const evidenceImageUrls = React.useMemo(() => {
    if (!task.evidence_url) return [];
    const urls = task.evidence_url
      .split(/\n|,/)
      .map(s => s.trim())
      .filter(s => s.startsWith('http://') || s.startsWith('https://'));
    return urls;
  }, [task.evidence_url]);

  const isImageEvidence = React.useMemo(() => {
    if (evidenceImageUrls.length > 0) {
      const first = evidenceImageUrls[0].toLowerCase();
      return (
        first.endsWith('.png') ||
        first.endsWith('.jpg') ||
        first.endsWith('.jpeg') ||
        first.endsWith('.gif') ||
        first.endsWith('.webp') ||
        first.endsWith('.svg') ||
        task.evidence_meta?.type === 'image'
      );
    }
    return false;
  }, [evidenceImageUrls, task.evidence_meta]);

  const assignee = members.find((m: Member) => m.uid === task.assigned_to_id);
  const reviewer = members.find((m: Member) => m.uid === task.assigned_reviewer_id);
  const isAssignee = user?.uid === task.assigned_to_id;
  const isReviewer = user?.uid === task.assigned_reviewer_id;
  const isLeader = role === 'leader';

  const canSubmitEvidence =
    isAssignee && (task.status === 'todo' || task.status === 'disputed');

  const canApproveReview = isReviewer && task.status === 'under_review';
  const canApproveProposal = isLeader && task.status === 'proposed';

  const loadComments = useCallback(async () => {
    try {
      const data = await taskApi.getComments(task.id, roomId);
      setComments(data);
    } catch (e) {
      console.error('Gagal load comments:', e);
    }
  }, [task.id, roomId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleToggleSubtask = async (index: number) => {
    const updated = [...(task.subtasks ?? [])];
    updated[index] = {...updated[index], done: !updated[index].done};
    setTask(prev => ({...prev, subtasks: updated}));
    try {
      await taskApi.updateSubtasks(task.id, roomId, updated);
    } catch (e: any) {
      Alert.alert('Gagal update subtask', e.message);
    }
  };

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;
    const newSub: TaskSubtask = {
      id: Math.random().toString(36).substring(2, 9),
      title: newSubtaskTitle.trim(),
      done: false,
      created_at: new Date().toISOString(),
    };
    const updated = [...(task.subtasks ?? []), newSub];
    setTask(prev => ({...prev, subtasks: updated}));
    setNewSubtaskTitle('');
    try {
      await taskApi.updateSubtasks(task.id, roomId, updated);
    } catch (e: any) {
      Alert.alert('Gagal tambah subtask', e.message);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return;
    setSubmittingComment(true);
    try {
      await taskApi.addComment(
        task.id,
        roomId,
        newComment.trim(),
        user.uid,
        user.displayName || 'Pengguna',
      );
      setNewComment('');
      loadComments();
    } catch (e: any) {
      Alert.alert('Gagal kirim komentar', e.message);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleGiveKudos = async () => {
    if (!user) return;
    try {
      await taskApi.giveKudos({
        taskId: task.id,
        giverUid: user.uid,
        roomId,
      });
      const already = (task.kudos_by ?? []).includes(user.uid);
      if (!already) {
        setTask(prev => ({
          ...prev,
          kudos_count: (prev.kudos_count ?? 0) + 1,
          kudos_by: [...(prev.kudos_by ?? []), user.uid],
        }));
        Alert.alert('Apresiasi Terkirim! ⭐', 'Kudos berhasil diberikan untuk tugas ini!');
      }
    } catch (e: any) {
      console.error(e);
    }
  };

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
      Alert.alert('Berhasil', 'Nudge pengingat terkirim!');
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

  const handleCallBackup = () => {
    Alert.prompt(
      'Panggil Bantuan',
      'Jelaskan kendala yang kamu hadapi kepada tim:',
      async text => {
        if (!text) return;
        setLoading(true);
        try {
          await memberApi.callBackup({
            roomId,
            taskId: task.id,
            actorUid: user?.uid ?? '',
            actorName: user?.displayName ?? '',
            message: text,
          });
          Alert.alert('Berhasil', 'Permintaan bantuan darurat telah dikirim ke tim!');
        } catch (e: any) {
          Alert.alert('Gagal', e.message);
        } finally {
          setLoading(false);
        }
      },
      'plain-text',
    );
  };

  const handleRescueTask = () => {
    Alert.alert(
      'Rescue Task',
      'Rescue tugas ini dan kembalikan ke Open Pool agar dapat dikerjakan member lain?',
      [
        {text: 'Batal', style: 'cancel'},
        {
          text: 'Rescue ke Open Pool',
          onPress: async () => {
            setLoading(true);
            try {
              await taskApi.rescueTask({
                taskId: task.id,
                roomId,
                newAssigneeId: null,
                actorUid: user?.uid ?? '',
                actorName: user?.displayName ?? '',
              });
              setTask(prev => ({...prev, assigned_to_id: '', status: 'todo'}));
              Alert.alert('Berhasil', 'Tugas berhasil di-rescue ke Open Pool!');
            } catch (e: any) {
              Alert.alert('Gagal', e.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const openEvidenceUrl = () => {
    if (task.evidence_url) {
      Linking.openURL(task.evidence_url).catch(() => {
        Alert.alert('Gagal', 'Tidak dapat membuka URL Evidence');
      });
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg0} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Text style={styles.closeBtnText}>Tutup</Text>
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

        {/* Info Grid */}
        <View style={styles.infoBox}>
          <InfoRow label="Ditugaskan ke" value={assignee?.display_name ?? (task.assigned_to_id ? task.assigned_to_id.slice(0, 8) : 'Open Pool')} />
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

        {/* Kudos Action Bar */}
        <View style={styles.kudosBar}>
          <TouchableOpacity style={styles.kudosBtn} onPress={handleGiveKudos}>
            <Text style={styles.kudosBtnText}>Beri Kudos ({task.kudos_count ?? 0})</Text>
          </TouchableOpacity>
        </View>

        {/* Subtasks Checklist Section */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>Subtasks Checklist</Text>
          {(task.subtasks ?? []).map((sub, idx) => (
            <TouchableOpacity
              key={sub.id || idx}
              style={styles.subtaskRow}
              onPress={() => handleToggleSubtask(idx)}>
              <View style={[styles.checkboxBox, sub.done && styles.checkboxBoxChecked]}>
                {sub.done && <Text style={styles.checkmarkText}>✓</Text>}
              </View>
              <Text style={[styles.subtaskTitle, sub.done && styles.subtaskCompleted]}>
                {sub.title}
              </Text>
            </TouchableOpacity>
          ))}

          <View style={styles.addSubtaskRow}>
            <TextInput
              style={styles.subtaskInput}
              value={newSubtaskTitle}
              onChangeText={setNewSubtaskTitle}
              placeholder="+ Tambah subtask baru..."
              placeholderTextColor={Colors.text3}
            />
            <TouchableOpacity style={styles.addSubtaskBtn} onPress={handleAddSubtask}>
              <Text style={styles.addSubtaskBtnText}>Tambah</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Evidence Section */}
        {task.evidence_url ? (
          <View style={styles.evidenceBox}>
            <View style={styles.evidenceHeaderRow}>
              <Text style={styles.evidenceLabel}>
                {isImageEvidence ? 'Bukti Tangkapan Layar / Foto' : 'Evidence URL'}
              </Text>
              <TouchableOpacity onPress={openEvidenceUrl}>
                <Text style={styles.openLinkText}>Buka Link ↗</Text>
              </TouchableOpacity>
            </View>

            {isImageEvidence && evidenceImageUrls.length > 0 ? (
              <TouchableOpacity
                style={styles.imagePreviewWrap}
                onPress={() => setShowImageViewer(true)}>
                <Image
                  source={{uri: evidenceImageUrls[0]}}
                  style={styles.evidenceImagePreview}
                  resizeMode="cover"
                />
                <View style={styles.imageOverlayBadge}>
                  <Text style={styles.imageOverlayBadgeText}>
                    Ketuk untuk Perbesar Foto ({evidenceImageUrls.length})
                  </Text>
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={openEvidenceUrl}>
                <Text style={styles.evidenceUrl} numberOfLines={2}>
                  {task.evidence_url}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}

        {/* Workflow Actions */}
        <View style={styles.actions}>
          {canSubmitEvidence && (
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => nav.navigate('SubmitEvidence', {task, roomId})}>
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

          {isAssignee && (task.status === 'todo' || task.status === 'disputed') && (
            <TouchableOpacity style={styles.btnWarning} onPress={handleCallBackup} disabled={loading}>
              <Text style={styles.btnWarningLabel}>Panggil Bantuan (Call Backup)</Text>
            </TouchableOpacity>
          )}

          {isLeader && task.assigned_to_id !== '' && task.status !== 'completed' && (
            <TouchableOpacity style={styles.btnWarning} onPress={handleRescueTask} disabled={loading}>
              <Text style={styles.btnWarningLabel}>Rescue Task ke Open Pool</Text>
            </TouchableOpacity>
          )}

          {!isAssignee && task.status !== 'completed' && (
            <TouchableOpacity style={styles.btnSecondary} onPress={handleNudge} disabled={loading}>
              <Text style={styles.btnSecondaryLabel}>Kirim Nudge Pengingat</Text>
            </TouchableOpacity>
          )}

          {isLeader && (
            <TouchableOpacity style={styles.btnDanger} onPress={handleDelete} disabled={loading}>
              <Text style={styles.btnDangerLabel}>Hapus Tugas</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Comments Section */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>Diskusi Komentar ({comments.length})</Text>

          {comments.map(c => (
            <View key={c.id} style={styles.commentItem}>
              <View style={styles.commentHeader}>
                <Text style={styles.commentAuthor}>{c.author_name}</Text>
                <Text style={styles.commentTime}>
                  {new Date(c.timestamp).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              <Text style={styles.commentText}>{c.comment_text}</Text>
            </View>
          ))}

          <View style={styles.addCommentRow}>
            <TextInput
              style={styles.commentInput}
              value={newComment}
              onChangeText={setNewComment}
              placeholder="Tulis komentar..."
              placeholderTextColor={Colors.text3}
            />
            <TouchableOpacity
              style={styles.sendCommentBtn}
              onPress={handleAddComment}
              disabled={submittingComment}>
              <Text style={styles.sendCommentText}>Kirim</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading && (
          <ActivityIndicator color={Colors.blue} style={{marginTop: Spacing.base}} />
        )}
      </ScrollView>

      {/* Fullscreen Interactive Photo Viewer Modal */}
      <ImageViewerModal
        visible={showImageViewer}
        imageUrls={evidenceImageUrls}
        onClose={() => setShowImageViewer(false)}
        title={`Bukti Foto · ${task.title}`}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: Colors.bg0},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeBtnText: {
    fontSize: Typography.base,
    color: Colors.blueLight,
    fontWeight: Typography.semibold,
  },
  statusBadge: {
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  statusLabel: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
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
  kudosBar: {
    flexDirection: 'row',
  },
  kudosBtn: {
    backgroundColor: 'rgba(234,179,8,0.15)',
    borderWidth: 1,
    borderColor: Colors.yellowDim,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  kudosBtnText: {
    color: Colors.yellow,
    fontWeight: Typography.bold,
    fontSize: Typography.sm,
  },
  sectionBox: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: Colors.text1,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 4,
  },
  checkboxBox: {
    width: 18,
    height: 18,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.bg3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: Colors.blue,
    borderColor: Colors.blue,
  },
  checkmarkText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: Typography.bold,
    lineHeight: 14,
  },
  checkbox: {
    fontSize: Typography.lg,
    color: Colors.blueLight,
  },
  subtaskTitle: {
    fontSize: Typography.sm,
    color: Colors.text1,
    flex: 1,
  },
  subtaskCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.text3,
  },
  addSubtaskRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  subtaskInput: {
    flex: 1,
    backgroundColor: Colors.bg3,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    color: Colors.text1,
    fontSize: Typography.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addSubtaskBtn: {
    backgroundColor: Colors.blue,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
  },
  addSubtaskBtnText: {
    color: Colors.white,
    fontWeight: Typography.semibold,
    fontSize: Typography.xs,
  },
  evidenceBox: {
    backgroundColor: Colors.bg3,
    borderRadius: Radius.md,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.xs,
  },
  evidenceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  evidenceLabel: {
    fontSize: Typography.xs,
    color: Colors.blueLight,
    fontWeight: Typography.bold,
  },
  openLinkText: {
    fontSize: Typography.xs,
    color: Colors.text3,
    fontWeight: Typography.medium,
  },
  evidenceUrl: {
    fontSize: Typography.sm,
    color: Colors.text1,
  },
  imagePreviewWrap: {
    width: '100%',
    height: 180,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.bg0,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 4,
    position: 'relative',
  },
  evidenceImagePreview: {
    width: '100%',
    height: '100%',
  },
  imageOverlayBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  imageOverlayBadgeText: {
    color: Colors.white,
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
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
    fontWeight: Typography.bold,
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
    fontWeight: Typography.semibold,
  },
  btnWarning: {
    backgroundColor: 'rgba(234,179,8,0.15)',
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(234,179,8,0.4)',
  },
  btnWarningLabel: {
    color: Colors.yellow,
    fontSize: Typography.base,
    fontWeight: Typography.bold,
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
    fontWeight: Typography.bold,
  },
  commentItem: {
    backgroundColor: Colors.bg3,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    gap: 2,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  commentAuthor: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.blueLight,
  },
  commentTime: {
    fontSize: 10,
    color: Colors.text3,
  },
  commentText: {
    fontSize: Typography.sm,
    color: Colors.text1,
    marginTop: 2,
  },
  addCommentRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  commentInput: {
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
  sendCommentBtn: {
    backgroundColor: Colors.blue,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
  },
  sendCommentText: {
    color: Colors.white,
    fontWeight: Typography.semibold,
    fontSize: Typography.sm,
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
