import React, {useState} from 'react';
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
import type {NativeStackNavigationProp} from '@react-navigation/native-stack'
import type {RouteProp} from '@react-navigation/native';;
import {taskApi} from '../api/tasks';
import {useAuthContext} from '../store/auth';
import {Colors} from '../theme/colors';
import {Typography} from '../theme/typography';
import {Spacing, Radius} from '../theme/spacing';
import type {MainStackParamList} from '../navigation/MainNavigator';
import type {TaskDifficulty, Member} from '../types';

type Nav = NativeStackNavigationProp<MainStackParamList>;
type Route = RouteProp<MainStackParamList, 'ProposeTask'>;

const DIFFICULTIES: TaskDifficulty[] = ['Easy', 'Medium', 'Hard', 'Very Hard'];
const DIFF_PTS: Record<TaskDifficulty, number> = {
  Easy: 5,
  Medium: 10,
  Hard: 20,
  'Very Hard': 35,
};

function FieldLabel({text, required}: {text: string; required?: boolean}) {
  return (
    <Text style={styles.fieldLabel}>
      {text}
      {required ? <Text style={{color: Colors.red}}> *</Text> : null}
    </Text>
  );
}

export default function ProposeTaskScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const {roomId, members, myUid, myMemberId} = route.params;
  const {user} = useAuthContext();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState<Member | null>(null);
  const [difficulty, setDifficulty] = useState<TaskDifficulty>('Medium');
  const [category, setCategory] = useState<'technical' | 'management'>('technical');
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Judul tugas wajib diisi');
      return;
    }
    if (!assignedTo) {
      setError('Pilih anggota yang ditugaskan');
      return;
    }
    if (!deadline) {
      setError('Deadline wajib diisi (YYYY-MM-DD)');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await taskApi.add({
        title: title.trim(),
        description: description.trim(),
        assignedToId: assignedTo.uid,
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
          <Text style={styles.closeBtn}>Batal</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Usulkan Tugas</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={Colors.blue} size="small" />
          ) : (
            <Text style={styles.submitBtn}>Usulkan</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <FieldLabel text="Judul Tugas" required />
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="contoh: Implementasi login page"
          placeholderTextColor={Colors.text3}
        />

        <FieldLabel text="Deskripsi" />
        <TextInput
          style={[styles.input, styles.textarea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Jelaskan tugas secara detail..."
          placeholderTextColor={Colors.text3}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <FieldLabel text="Ditugaskan ke" required />
        <View style={styles.memberGrid}>
          {members.map((m: Member) => (
            <TouchableOpacity
              key={m.id}
              style={[
                styles.memberChip,
                assignedTo?.id === m.id && styles.memberChipActive,
              ]}
              onPress={() => setAssignedTo(m)}>
              <Text
                style={[
                  styles.memberChipLabel,
                  assignedTo?.id === m.id && styles.memberChipLabelActive,
                ]}>
                {m.display_name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <FieldLabel text="Kesulitan" required />
        <View style={styles.row}>
          {DIFFICULTIES.map(d => (
            <TouchableOpacity
              key={d}
              style={[styles.diffChip, difficulty === d && styles.diffChipActive]}
              onPress={() => setDifficulty(d)}>
              <Text
                style={[
                  styles.diffLabel,
                  difficulty === d && styles.diffLabelActive,
                ]}>
                {d}
              </Text>
              <Text style={styles.diffPts}>{DIFF_PTS[d]} pts</Text>
            </TouchableOpacity>
          ))}
        </View>

        <FieldLabel text="Kategori" />
        <View style={styles.row}>
          {(['technical', 'management'] as const).map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.catChip, category === c && styles.catChipActive]}
              onPress={() => setCategory(c)}>
              <Text
                style={[
                  styles.catLabel,
                  category === c && styles.catLabelActive,
                ]}>
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <FieldLabel text="Deadline Internal (YYYY-MM-DD)" required />
        <TextInput
          style={styles.input}
          value={deadline}
          onChangeText={setDeadline}
          placeholder="2025-12-31"
          placeholderTextColor={Colors.text3}
          keyboardType="numeric"
        />
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
  closeBtn: {color: Colors.text2, fontSize: Typography.base},
  headerTitle: {
    fontSize: Typography.md,
    fontWeight: Typography.semibold,
    color: Colors.text1,
  },
  submitBtn: {
    color: Colors.blue,
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
  },
  content: {padding: Spacing.base, gap: Spacing.sm, paddingBottom: 60},
  fieldLabel: {
    fontSize: Typography.sm,
    color: Colors.text2,
    fontWeight: Typography.medium,
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
  memberChipLabel: {
    fontSize: Typography.sm,
    color: Colors.text2,
    fontWeight: Typography.medium,
  },
  memberChipLabelActive: {color: Colors.blueLight},
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
    fontSize: Typography.sm,
    color: Colors.text2,
    fontWeight: Typography.medium,
  },
  diffLabelActive: {color: Colors.blueLight},
  diffPts: {fontSize: 10, color: Colors.text3},
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
  catLabel: {fontSize: Typography.sm, color: Colors.text2, textTransform: 'capitalize'},
  catLabelActive: {color: Colors.blueLight},
  errorBox: {
    backgroundColor: Colors.redDim,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.redBorder,
  },
  errorText: {color: Colors.red, fontSize: Typography.sm},
});
