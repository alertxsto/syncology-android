/**
 * CreateRoomModal — Pembuatan Room Baru dengan Visual Date Picker.
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import {Colors} from '../theme/colors';
import {Typography} from '../theme/typography';
import {Spacing, Radius} from '../theme/spacing';
import {CalendarPickerModal} from './CalendarPickerModal';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    projectName: string;
    globalDeadline: string | null;
    externalChatUrl: string | null;
  }) => Promise<void>;
}

export function CreateRoomModal({visible, onClose, onSubmit}: Props) {
  const [projectName, setProjectName] = useState('');
  const [globalDeadline, setGlobalDeadline] = useState('');
  const [externalChatUrl, setExternalChatUrl] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!projectName.trim()) {
      setError('Nama proyek wajib diisi');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onSubmit({
        projectName: projectName.trim(),
        globalDeadline: globalDeadline || null,
        externalChatUrl: externalChatUrl.trim() || null,
      });
      setProjectName('');
      setGlobalDeadline('');
      setExternalChatUrl('');
      onClose();
    } catch (e: any) {
      setError(e.message ?? 'Gagal membuat room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}>
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Buat Room Baru</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Text style={styles.label}>Nama Proyek *</Text>
            <TextInput
              style={styles.input}
              value={projectName}
              onChangeText={setProjectName}
              placeholder="contoh: Syncology App v2"
              placeholderTextColor={Colors.text3}
              autoFocus
            />

            <Text style={styles.label}>Deadline Proyek (Opsional)</Text>
            <TouchableOpacity
              style={styles.dateSelector}
              onPress={() => setShowCalendar(true)}>
              <Text
                style={[
                  styles.dateText,
                  !globalDeadline && {color: Colors.text3},
                ]}>
                {globalDeadline
                  ? new Date(globalDeadline).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : 'Pilih Tanggal Deadline...'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.label}>URL Chat Eksternal (Opsional)</Text>
            <TextInput
              style={styles.input}
              value={externalChatUrl}
              onChangeText={setExternalChatUrl}
              placeholder="https://t.me/yourgroup atau Discord Link"
              placeholderTextColor={Colors.text3}
              keyboardType="url"
              autoCapitalize="none"
            />

            <View style={styles.footer}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
                <Text style={styles.cancelLabel}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.submitLabel}>Buat Room</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <CalendarPickerModal
        visible={showCalendar}
        selectedDate={globalDeadline}
        onSelectDate={setGlobalDeadline}
        onClose={() => setShowCalendar(false)}
        title="Deadline Proyek"
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  card: {
    backgroundColor: Colors.bg2,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    padding: Spacing.base,
    paddingBottom: Spacing.xl,
    gap: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  headerTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.text1,
  },
  closeBtn: {
    fontSize: Typography.lg,
    color: Colors.text3,
  },
  label: {
    fontSize: Typography.xs,
    color: Colors.text2,
    fontWeight: Typography.semibold,
    marginTop: Spacing.xs,
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
  dateSelector: {
    backgroundColor: Colors.bg3,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  dateText: {
    fontSize: Typography.base,
    color: Colors.text1,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelLabel: {
    color: Colors.text2,
    fontSize: Typography.base,
    fontWeight: Typography.medium,
  },
  submitBtn: {
    flex: 2,
    backgroundColor: Colors.blue,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  submitLabel: {
    color: Colors.white,
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
  },
  errorBox: {
    backgroundColor: Colors.redDim,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.redBorder,
  },
  errorText: {
    color: Colors.red,
    fontSize: Typography.sm,
  },
});
