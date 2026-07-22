import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  ScrollView,
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

type Nav = NativeStackNavigationProp<MainStackParamList>;
type Route = RouteProp<MainStackParamList, 'SubmitEvidence'>;

export default function SubmitEvidenceScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const {task, roomId} = route.params;
  const {user} = useAuthContext();

  const [evidenceUrl, setEvidenceUrl] = useState(task.evidence_url ?? '');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!evidenceUrl.trim()) {
      setError('URL evidence wajib diisi');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await taskApi.submitEvidence({
        taskId: task.id,
        evidenceUrl: evidenceUrl.trim(),
        roomId,
        actorUid: user?.uid ?? '',
        actorName: user?.displayName ?? '',
        notes: notes.trim(),
      });
      Alert.alert('Berhasil', 'Evidence berhasil dikirim! Menunggu review.');
      nav.goBack();
    } catch (e: any) {
      setError(e.message ?? 'Gagal submit evidence');
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
        <Text style={styles.headerTitle}>Submit Evidence</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={Colors.blue} size="small" />
          ) : (
            <Text style={styles.submitBtn}>Kirim</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.taskInfo}>
          <Text style={styles.taskInfoLabel}>Tugas</Text>
          <Text style={styles.taskTitle}>{task.title}</Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Text style={styles.fieldLabel}>
          URL Evidence <Text style={{color: Colors.red}}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          value={evidenceUrl}
          onChangeText={setEvidenceUrl}
          placeholder="https://github.com/... atau link lainnya"
          placeholderTextColor={Colors.text3}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />

        <Text style={styles.fieldLabel}>Catatan Tambahan (opsional)</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Jelaskan apa yang kamu kerjakan..."
          placeholderTextColor={Colors.text3}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <Text style={styles.hint}>
          Setelah dikirim, tugas akan berpindah ke status "Menunggu Review".
          Reviewer akan memeriksa evidence kamu.
        </Text>
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
  taskInfo: {
    backgroundColor: Colors.bg3,
    borderRadius: Radius.md,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
    marginBottom: Spacing.sm,
  },
  taskInfoLabel: {
    fontSize: Typography.xs,
    color: Colors.text3,
    fontWeight: Typography.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  taskTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.text1,
  },
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
  errorBox: {
    backgroundColor: Colors.redDim,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.redBorder,
  },
  errorText: {color: Colors.red, fontSize: Typography.sm},
  hint: {
    fontSize: Typography.sm,
    color: Colors.text3,
    lineHeight: 20,
    marginTop: Spacing.base,
  },
});
