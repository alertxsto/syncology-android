/**
 * ImageViewerModal — Interactive Image Evidence Viewer Modal.
 *
 * Menampilkan modal preview gambar layar penuh ketika bukti tugas
 * berupa foto/screenshot diklik oleh pengguna.
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import {Colors} from '../theme/colors';
import {Typography} from '../theme/typography';
import {Spacing, Radius} from '../theme/spacing';

interface Props {
  visible: boolean;
  imageUrls: string[];
  initialIndex?: number;
  onClose: () => void;
  title?: string;
}

export function ImageViewerModal({
  visible,
  imageUrls,
  initialIndex = 0,
  onClose,
  title = 'Bukti Foto Pekerjaan',
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  if (!imageUrls || imageUrls.length === 0) return null;

  const activeUrl = imageUrls[currentIndex] || imageUrls[0];

  const handleOpenExternal = () => {
    if (activeUrl) {
      Linking.openURL(activeUrl).catch(() => {
        Alert.alert('Gagal', 'Tidak dapat membuka URL di browser');
      });
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />

        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleArea}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              {imageUrls.length > 1 && (
                <Text style={styles.counterText}>
                  {currentIndex + 1} dari {imageUrls.length}
                </Text>
              )}
            </View>

            <TouchableOpacity onPress={onClose} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Main Image View */}
          <View style={styles.imageWrap}>
            <Image
              source={{uri: activeUrl}}
              style={styles.image}
              resizeMode="contain"
            />
          </View>

          {/* Thumbnails list if multiple images */}
          {imageUrls.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbRow}>
              {imageUrls.map((url, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.thumbWrap,
                    idx === currentIndex && styles.thumbWrapActive,
                  ]}
                  onPress={() => setCurrentIndex(idx)}>
                  <Image source={{uri: url}} style={styles.thumbImage} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Footer Bar */}
          <View style={styles.footer}>
            <Text style={styles.urlText} numberOfLines={1}>
              {activeUrl}
            </Text>
            <TouchableOpacity style={styles.openBtn} onPress={handleOpenExternal}>
              <Text style={styles.openBtnText}>Buka Tautan ↗</Text>
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
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.base,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  card: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: Colors.bg2,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    padding: Spacing.base,
    gap: Spacing.sm,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleArea: {
    flex: 1,
  },
  title: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: Colors.text1,
  },
  counterText: {
    fontSize: Typography.xs,
    color: Colors.blueLight,
    fontWeight: Typography.semibold,
  },
  closeBtn: {
    fontSize: Typography.lg,
    color: Colors.text3,
    fontWeight: Typography.bold,
    paddingLeft: Spacing.sm,
  },
  imageWrap: {
    width: '100%',
    height: 320,
    backgroundColor: Colors.bg0,
    borderRadius: Radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  thumbRow: {
    gap: Spacing.xs,
    paddingVertical: 4,
  },
  thumbWrap: {
    width: 50,
    height: 50,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.transparent,
  },
  thumbWrapActive: {
    borderColor: Colors.blue,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  urlText: {
    flex: 1,
    fontSize: Typography.xs,
    color: Colors.text3,
  },
  openBtn: {
    backgroundColor: Colors.bg3,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  openBtnText: {
    fontSize: Typography.xs,
    color: Colors.blueLight,
    fontWeight: Typography.semibold,
  },
});
