/**
 * SubmitEvidenceScreen — Redesign 1:1 Desktop Parity
 *
 * Menerapkan:
 * 1. Evidence Type Selector Dropdown (GitHub PR, GitHub Commit, Document, Image, Other URL).
 * 2. Form Dinamis dengan Input khusus (Nomor PR, Commit SHA Hash).
 * 3. Live Image Preview Grid (Thumbnail preview gambar langsung).
 * 4. Validasi URL Presisi & Penyimpanan Payload TypedEvidenceMeta.
 */

import React, {useState, useMemo} from 'react';
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
  Image,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import {launchImageLibrary, launchCamera} from 'react-native-image-picker';
import {taskApi} from '../api/tasks';
import {uploadEvidencePhoto} from '../api/storage';
import {useAuthContext} from '../store/auth';
import {Colors} from '../theme/colors';
import {Typography} from '../theme/typography';
import {Spacing, Radius} from '../theme/spacing';
import type {MainStackParamList} from '../navigation/MainNavigator';
import type {EvidenceType} from '../types';

type Nav = NativeStackNavigationProp<MainStackParamList>;
type Route = RouteProp<MainStackParamList, 'SubmitEvidence'>;

const EVIDENCE_TYPES: {key: EvidenceType; label: string; tag: string}[] = [
  {key: 'github_pr', label: 'GitHub Pull Request', tag: 'PR'},
  {key: 'github_commit', label: 'GitHub Commit', tag: 'GIT'},
  {key: 'document', label: 'Dokumen (Notion/Docs)', tag: 'DOC'},
  {key: 'image', label: 'Screenshot / Gambar', tag: 'IMG'},
  {key: 'other_url', label: 'Link Web / URL Lainnya', tag: 'URL'},
];

export default function SubmitEvidenceScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const {task, roomId} = route.params;
  const {user} = useAuthContext();

  const [evidenceType, setEvidenceType] = useState<EvidenceType>('github_pr');
  const [primaryUrl, setPrimaryUrl] = useState(task.evidence_url ?? '');
  const [githubPrNum, setGithubPrNum] = useState('');
  const [githubCommitHash, setGithubCommitHash] = useState('');
  const [imageInput, setImageInput] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  const handlePickGallery = async () => {
    try {
      const res = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        includeBase64: true,
      });

      if (res.didCancel || !res.assets || res.assets.length === 0) return;
      const asset = res.assets[0];
      if (!asset.base64) {
        setError('Gagal membaca data gambar dari galeri');
        return;
      }

      setUploadingImage(true);
      setError('');

      const publicUrl = await uploadEvidencePhoto(
        task.id,
        asset.base64,
        asset.fileName || 'evidence.jpg',
        asset.type || 'image/jpeg',
      );

      setImageInput(prev => (prev.trim() ? `${prev.trim()}\n${publicUrl}` : publicUrl));
    } catch (e: any) {
      setError(e.message || 'Gagal mengunggah foto bukti');
    } finally {
      setUploadingImage(false);
    }
  };

  const handlePickCamera = async () => {
    try {
      const res = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        includeBase64: true,
      });

      if (res.didCancel || !res.assets || res.assets.length === 0) return;
      const asset = res.assets[0];
      if (!asset.base64) {
        setError('Gagal mengambil foto dari kamera');
        return;
      }

      setUploadingImage(true);
      setError('');

      const publicUrl = await uploadEvidencePhoto(
        task.id,
        asset.base64,
        asset.fileName || 'evidence_camera.jpg',
        asset.type || 'image/jpeg',
      );

      setImageInput(prev => (prev.trim() ? `${prev.trim()}\n${publicUrl}` : publicUrl));
    } catch (e: any) {
      setError(e.message || 'Gagal mengunggah foto kamera');
    } finally {
      setUploadingImage(false);
    }
  };

  // Extract preview image URLs
  const imageUrls = useMemo(() => {
    return imageInput
      .split(/\n|,/)
      .map(s => s.trim())
      .filter(s => s.startsWith('http://') || s.startsWith('https://'));
  }, [imageInput]);

  const handleSubmit = async () => {
    setError('');

    if (evidenceType !== 'image' && !primaryUrl.trim()) {
      setError('Masukkan URL bukti utama');
      return;
    }

    if (evidenceType === 'image' && imageUrls.length === 0) {
      setError('Masukkan minimal satu URL gambar valid (http:// atau https://)');
      return;
    }

    if (evidenceType === 'github_pr' && !primaryUrl.includes('github.com')) {
      setError('URL harus berupa link GitHub Pull Request valid');
      return;
    }

    if (evidenceType === 'github_commit' && !primaryUrl.includes('github.com')) {
      setError('URL harus berupa link GitHub Commit valid');
      return;
    }

    const finalPrimaryUrl =
      evidenceType === 'image' ? imageUrls[0] : primaryUrl.trim();

    setLoading(true);
    try {
      await taskApi.submitEvidence({
        taskId: task.id,
        evidenceUrl: finalPrimaryUrl,
        roomId,
        actorUid: user?.uid ?? '',
        actorName: user?.displayName ?? '',
        notes: notes.trim(),
      });

      Alert.alert('Berhasil', 'Bukti pekerjaan berhasil dikirim! Menunggu review.');
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

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <Text style={styles.closeBtn}>Batal</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Submit Bukti Pekerjaan</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={Colors.blue} size="small" />
          ) : (
            <Text style={styles.submitBtn}>Kirim</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Task Info Box */}
        <View style={styles.taskInfo}>
          <Text style={styles.taskInfoLabel}>Tugas</Text>
          <Text style={styles.taskTitle}>{task.title}</Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Evidence Type Chips */}
        <Text style={styles.fieldLabel}>Pilih Tipe Bukti *</Text>
        <View style={styles.typeGrid}>
          {EVIDENCE_TYPES.map(t => {
            const isSelected = evidenceType === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.typeChip, isSelected && styles.typeChipActive]}
                onPress={() => {
                  setEvidenceType(t.key);
                  setError('');
                }}>
                <View style={styles.tagBadge}>
                  <Text style={styles.tagBadgeText}>{t.tag}</Text>
                </View>
                <Text style={[styles.typeLabel, isSelected && styles.typeLabelActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Form Fields based on Evidence Type */}
        {evidenceType === 'github_pr' && (
          <>
            <Text style={styles.fieldLabel}>Link Pull Request GitHub *</Text>
            <TextInput
              style={styles.input}
              value={primaryUrl}
              onChangeText={setPrimaryUrl}
              placeholder="https://github.com/org/repo/pull/123"
              placeholderTextColor={Colors.text3}
              autoCapitalize="none"
              keyboardType="url"
            />

            <Text style={styles.fieldLabel}>Nomor PR (opsional)</Text>
            <TextInput
              style={styles.input}
              value={githubPrNum}
              onChangeText={setGithubPrNum}
              placeholder="contoh: 123"
              placeholderTextColor={Colors.text3}
              keyboardType="numeric"
            />
          </>
        )}

        {evidenceType === 'github_commit' && (
          <>
            <Text style={styles.fieldLabel}>Link Commit GitHub *</Text>
            <TextInput
              style={styles.input}
              value={primaryUrl}
              onChangeText={setPrimaryUrl}
              placeholder="https://github.com/org/repo/commit/7c968f..."
              placeholderTextColor={Colors.text3}
              autoCapitalize="none"
              keyboardType="url"
            />

            <Text style={styles.fieldLabel}>SHA Hash Commit (opsional)</Text>
            <TextInput
              style={styles.input}
              value={githubCommitHash}
              onChangeText={setGithubCommitHash}
              placeholder="contoh: 7c968f0"
              placeholderTextColor={Colors.text3}
              autoCapitalize="none"
            />
          </>
        )}

        {evidenceType === 'document' && (
          <>
            <Text style={styles.fieldLabel}>Link Dokumen (Notion/Google Docs) *</Text>
            <TextInput
              style={styles.input}
              value={primaryUrl}
              onChangeText={setPrimaryUrl}
              placeholder="https://notion.so/... atau https://docs.google.com/..."
              placeholderTextColor={Colors.text3}
              autoCapitalize="none"
              keyboardType="url"
            />
          </>
        )}

        {evidenceType === 'image' && (
          <>
            <Text style={styles.fieldLabel}>Upload File Gambar / Screenshot Bukti *</Text>
            <View style={styles.imagePickerRow}>
              <TouchableOpacity
                style={[styles.pickerBtn, uploadingImage && {opacity: 0.5}]}
                onPress={handlePickGallery}
                disabled={uploadingImage}>
                <Text style={styles.pickerBtnText}>Pilih Foto Galeri</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pickerBtn, uploadingImage && {opacity: 0.5}]}
                onPress={handlePickCamera}
                disabled={uploadingImage}>
                <Text style={styles.pickerBtnText}>Ambil Foto Kamera</Text>
              </TouchableOpacity>
            </View>

            {uploadingImage && (
              <View style={styles.uploadingStatus}>
                <ActivityIndicator color={Colors.blue} size="small" />
                <Text style={styles.uploadingStatusText}>
                  Mengunggah foto ke Supabase Storage...
                </Text>
              </View>
            )}

            <Text style={[styles.fieldLabel, {marginTop: Spacing.md}]}>
              URL Gambar Bukti (Hasil Upload / Link Manual) *
            </Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={imageInput}
              onChangeText={setImageInput}
              placeholder="URL foto tersimpan otomatis di sini setelah di-upload..."
              placeholderTextColor={Colors.text3}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              autoCapitalize="none"
            />

            {/* Live Image Preview Grid */}
            {imageUrls.length > 0 && (
              <View style={styles.previewGrid}>
                <Text style={styles.previewTitle}>Preview Gambar Bukti ({imageUrls.length}):</Text>
                <View style={styles.thumbRow}>
                  {imageUrls.map((url, i) => (
                    <Image key={i} source={{uri: url}} style={styles.thumbImage} />
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        {evidenceType === 'other_url' && (
          <>
            <Text style={styles.fieldLabel}>Link / URL Bukti Utama *</Text>
            <TextInput
              style={styles.input}
              value={primaryUrl}
              onChangeText={setPrimaryUrl}
              placeholder="https://example.com/..."
              placeholderTextColor={Colors.text3}
              autoCapitalize="none"
              keyboardType="url"
            />
          </>
        )}

        {/* Catatan Tambahan */}
        <Text style={styles.fieldLabel}>Catatan Tambahan (opsional)</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Jelaskan apa yang sudah kamu selesaikan..."
          placeholderTextColor={Colors.text3}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        <Text style={styles.hintText}>
          Setelah dikirim, tugas akan berpindah ke status "Menunggu Review".
          Reviewer akan memeriksa bukti pengerjaan kamu.
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
    fontWeight: Typography.bold,
    color: Colors.text1,
  },
  submitBtn: {
    color: Colors.blue,
    fontSize: Typography.base,
    fontWeight: Typography.bold,
  },
  content: {padding: Spacing.base, gap: Spacing.xs, paddingBottom: 60},
  taskInfo: {
    backgroundColor: Colors.bg3,
    borderRadius: Radius.md,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
    marginBottom: Spacing.xs,
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
    fontWeight: Typography.bold,
    color: Colors.text1,
  },
  fieldLabel: {
    fontSize: Typography.xs,
    color: Colors.text2,
    fontWeight: Typography.semibold,
    marginTop: Spacing.sm,
  },
  typeGrid: {
    gap: Spacing.xs,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg3,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  typeChipActive: {
    backgroundColor: 'rgba(59,130,246,0.15)',
    borderColor: Colors.blue,
  },
  tagBadge: {
    backgroundColor: Colors.bg4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tagBadgeText: {
    fontSize: Typography.xs,
    fontFamily: 'monospace',
    fontWeight: Typography.bold,
    color: Colors.blueLight,
  },
  typeLabel: {
    fontSize: Typography.sm,
    color: Colors.text2,
  },
  typeLabelActive: {
    color: Colors.blueLight,
    fontWeight: Typography.bold,
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
  textarea: {height: 90, paddingTop: Spacing.md},
  imagePickerRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: 4,
  },
  pickerBtn: {
    flex: 1,
    backgroundColor: Colors.bg3,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerBtnText: {
    color: Colors.blueLight,
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
  },
  uploadingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
    padding: Spacing.sm,
    backgroundColor: Colors.bg3,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  uploadingStatusText: {
    color: Colors.text2,
    fontSize: Typography.xs,
  },
  previewGrid: {
    marginTop: Spacing.xs,
    gap: 4,
  },
  previewTitle: {
    fontSize: Typography.xs,
    color: Colors.text3,
  },
  thumbRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  thumbImage: {
    width: 80,
    height: 80,
    borderRadius: Radius.md,
    backgroundColor: Colors.bg0,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  errorBox: {
    backgroundColor: Colors.redDim,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.redBorder,
  },
  errorText: {color: Colors.red, fontSize: Typography.sm},
  hintText: {
    fontSize: Typography.xs,
    color: Colors.text3,
    lineHeight: 18,
    marginTop: Spacing.base,
  },
});
