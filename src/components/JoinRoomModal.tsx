/**
 * JoinRoomModal — Gabung Room via Kode 6-Karakter.
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

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (code: string) => Promise<void>;
}

export function JoinRoomModal({visible, onClose, onSubmit}: Props) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!code.trim()) {
      setError('Kode room wajib diisi');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onSubmit(code.trim().toUpperCase());
      setCode('');
      onClose();
    } catch (e: any) {
      setError(e.message ?? 'Kode room tidak valid');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Gabung Kode Room</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>Kode Unik Room (6 Karakter)</Text>
          <TextInput
            style={styles.inputCode}
            value={code}
            onChangeText={t => setCode(t.toUpperCase())}
            placeholder="ABC123"
            placeholderTextColor={Colors.text3}
            maxLength={6}
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus
          />

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelLabel}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <Text style={styles.submitLabel}>Gabung Proyek</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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
  inputCode: {
    backgroundColor: Colors.bg3,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    color: Colors.blueLight,
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    textAlign: 'center',
    letterSpacing: 6,
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
