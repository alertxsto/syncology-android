/**
 * ProposeTaskScreen — Redesign 1:1 Desktop Parity
 *
 * Menerapkan:
 * 1. Smart Load Balancer Banner (Rekomendasi member ter-senggang).
 * 2. Status Beban Kerja Member (🟢 Ringan, 🟡 Normal, 🔴 Overload, Open Pool).
 * 3. Modal Popup Kalender Interaktif (CalendarPickerModal).
 */

import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import {taskApi} from '../api/tasks';
import {useAuthContext} from '../store/auth';
import {Colors} from '../theme/colors';
import {Typography} from '../theme/typography';
import {Spacing, Radius} from '../theme/spacing';
import type {MainStackParamList} from '../navigation/MainNavigator';
import type {TaskDifficulty, Member, Task} from '../types';
import {CalendarPickerModal} from '../components/CalendarPickerModal';

type Nav = NativeStackNavigationProp<MainStackParamList>;
type Route = RouteProp<MainStackParamList, 'ProposeTask'>;

const DIFFICULTIES: TaskDifficulty[] = ['Easy', 'Medium', 'Hard', 'Very Hard'];
const DIFF_PTS: Record<TaskDifficulty, number> = {
  Easy: 5,
  Medium: 10,
  Hard: 20,
  'Very Hard': 35,
};

export default function ProposeTaskScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const {roomId, members, myUid, myMemberId} = route.params;
  const {user} = useAuthContext();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState<Member | null>(null);
  const [isOpenPool, setIsOpenPool] = useState(false);
  const [difficulty, setDifficulty] = useState<TaskDifficulty>('Medium');
  const [category, setCategory] = useState<'technical' | 'management'>('technical');
  const [deadline, setDeadline] = useState('');
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [existingTasks, setExistingTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch tasks in room to calculate workloads
  useEffect(() => {
    taskApi.list(roomId).then(setExistingTasks).catch(console.error);
  }, [roomId]);

  // Calculate workloads (active points) per member
  const memberWorkloads = useMemo(() => {
    const map: Record<string, number> = {};
    members.forEach(m => {
      map[m.uid] = 0;
    });
    existingTasks.forEach(t => {
      if (t.status !== 'completed' && t.assigned_to_id) {
        map[t.assigned_to_id] = (map[t.assigned_to_id] || 0) + (t.weight || 10);
      }
    });
    return map;
  }, [members, existingTasks]);

  // Get member with the lowest workload recommendation
  const recommendation = useMemo<{member: Member; points: number} | null>(() => {
    if (members.length === 0) return null;
    let minPoints = Infinity;
    let bestMember: Member | null = null;

    members.forEach((m: Member) => {
      const pts = memberWorkloads[m.uid] || 0;
      if (pts < minPoints) {
        minPoints = pts;
        bestMember = m;
      }
    });

    return bestMember ? {member: bestMember, points: minPoints} : null;
  }, [members, memberWorkloads]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Judul tugas wajib diisi');
      return;
    }
    if (!isOpenPool && !assignedTo) {
      setError('Pilih anggota yang ditugaskan atau pilih Open Pool');
      return;
    }
    if (!deadline) {
      setError('Pilih tanggal deadline');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await taskApi.add({
        title: title.trim(),
        description: description.trim(),
        assignedToId: isOpenPool ? '' : (assignedTo?.uid ?? ''),
        difficulty,
        category,
        internalDeadline: deadline,
        roomId,
        proposedById: myMemberId,
        proposerName: user?.displayName ?? '',
        proposerUid: myUid,
      });
      Alert.alert('Berhasil', 'Tugas berhasil diusulkan!');
      nav.goBack();
    } catch (e: any) {
      setError(e.message ?? 'Gagal mengusulkan tugas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg1} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <Text style={styles.cancelBtnText}>Batal</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Usulkan Tugas Baru</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={Colors.blue} size="small" />
          ) : (
            <Text style={styles.submitBtnText}>Usulkan</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Smart Load Balancer Banner */}
        {recommendation ? (
          <View style={styles.recommendationBanner}>
            <Text style={styles.recIcon}>🟢</Text>
            <Text style={styles.recText}>
              <Text style={styles.recBold}>Saran Load Balancer: </Text>
              Direkomendasikan ditugaskan ke{' '}
              <Text style={styles.recBold}>{recommendation.member.display_name}</Text>{' '}
              karena memiliki beban kerja paling ringan ({recommendation.points} pt aktif).
            </Text>
          </View>
        ) : null}

        <Text style={styles.fieldLabel}>Judul Tugas *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="contoh: Implementasi login page"
          placeholderTextColor={Colors.text3}
        />

        <Text style={styles.fieldLabel}>Deskripsi</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Konteks, acceptance criteria, referensi..."
          placeholderTextColor={Colors.text3}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <Text style={styles.fieldLabel}>Ditugaskan ke *</Text>
        <View style={styles.memberGrid}>
          {/* Open Pool Option */}
          <TouchableOpacity
            style={[styles.memberChip, isOpenPool && styles.memberChipActive]}
            onPress={() => {
              setIsOpenPool(true);
              setAssignedTo(null);
            }}>
            <Text style={[styles.memberChipText, isOpenPool && styles.memberChipTextActive]}>
              🌐 Open Pool (Unassigned)
            </Text>
          </TouchableOpacity>

          {members.map((m: Member) => {
            const pts = memberWorkloads[m.uid] || 0;
            const isOverloaded = pts > 25;
            const isNormal = pts > 12 && pts <= 25;
            const indicator = isOverloaded ? '🔴' : isNormal ? '🟡' : '🟢';
            const isSelected = !isOpenPool && assignedTo?.id === m.id;

            return (
              <TouchableOpacity
                key={m.id}
                style={[styles.memberChip, isSelected && styles.memberChipActive]}
                onPress={() => {
                  setIsOpenPool(false);
                  setAssignedTo(m);
                }}>
                <Text style={[styles.memberChipText, isSelected && styles.memberChipTextActive]}>
                  {indicator} {m.display_name} ({pts} pt)
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.fieldLabel}>Kesulitan (Difficulty) *</Text>
        <View style={styles.row}>
          {DIFFICULTIES.map(d => (
            <TouchableOpacity
              key={d}
              style={[styles.diffChip, difficulty === d && styles.diffChipActive]}
              onPress={() => setDifficulty(d)}>
              <Text style={[styles.diffLabel, difficulty === d && styles.diffLabelActive]}>
                {d}
              </Text>
              <Text style={styles.diffPts}>{DIFF_PTS[d]} pts</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Kategori</Text>
        <View style={styles.row}>
          {(['technical', 'management'] as const).map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.catChip, category === c && styles.catChipActive]}
              onPress={() => setCategory(c)}>
              <Text style={[styles.catLabel, category === c && styles.catLabelActive]}>
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Deadline Internal *</Text>
        <TouchableOpacity
          style={styles.dateSelectorBtn}
          onPress={() => setShowCalendarModal(true)}>
          <Text style={[styles.dateSelectorText, !deadline && {color: Colors.text3}]}>
            {deadline
              ? new Date(deadline).toLocaleDateString('id-ID', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })
              : '📅 Ketuk untuk Pilih Deadline Kalender...'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Interactive Calendar Popup Modal */}
      <CalendarPickerModal
        visible={showCalendarModal}
        selectedDate={deadline}
        onSelectDate={setDeadline}
        onClose={() => setShowCalendarModal(false)}
        title="Pilih Deadline Tugas"
      />
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
  cancelBtnText: {color: Colors.text2, fontSize: Typography.base},
  headerTitle: {
    fontSize: Typography.md,
    fontWeight: Typography.bold,
    color: Colors.text1,
  },
  submitBtnText: {
    color: Colors.blue,
    fontSize: Typography.base,
    fontWeight: Typography.bold,
  },
  content: {padding: Spacing.base, gap: Spacing.xs, paddingBottom: 60},
  recommendationBanner: {
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderWidth: 1,
    borderColor: Colors.greenBorder,
    borderRadius: Radius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: Spacing.xs,
  },
  recIcon: {fontSize: 16},
  recText: {
    flex: 1,
    fontSize: Typography.xs,
    color: Colors.text1,
    lineHeight: 18,
  },
  recBold: {fontWeight: Typography.bold, color: Colors.green},
  fieldLabel: {
    fontSize: Typography.xs,
    color: Colors.text2,
    fontWeight: Typography.semibold,
    marginTop: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.bg3,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    color: Colors.text1,
    fontSize: Typography.base,
  },
  textarea: {height: 100, paddingTop: Spacing.md},
  memberGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  memberChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.bg3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  memberChipActive: {
    backgroundColor: 'rgba(59,130,246,0.15)',
    borderColor: Colors.blue,
  },
  memberChipText: {
    fontSize: Typography.xs,
    color: Colors.text2,
    fontWeight: Typography.medium,
  },
  memberChipTextActive: {color: Colors.blueLight, fontWeight: Typography.bold},
  row: {flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs},
  diffChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.md,
    backgroundColor: Colors.bg3,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  diffChipActive: {
    backgroundColor: 'rgba(59,130,246,0.15)',
    borderColor: Colors.blue,
  },
  diffLabel: {
    fontSize: Typography.xs,
    color: Colors.text2,
    fontWeight: Typography.medium,
  },
  diffLabelActive: {color: Colors.blueLight, fontWeight: Typography.bold},
  diffPts: {fontSize: 10, color: Colors.text3, marginTop: 2},
  catChip: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.bg3,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  catChipActive: {
    backgroundColor: 'rgba(59,130,246,0.15)',
    borderColor: Colors.blue,
  },
  catLabel: {fontSize: Typography.xs, color: Colors.text2, textTransform: 'capitalize'},
  catLabelActive: {color: Colors.blueLight, fontWeight: Typography.bold},
  dateSelectorBtn: {
    backgroundColor: Colors.bg3,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  dateSelectorText: {
    fontSize: Typography.base,
    color: Colors.text1,
  },
  errorBox: {
    backgroundColor: Colors.redDim,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.redBorder,
  },
  errorText: {color: Colors.red, fontSize: Typography.sm},
});
