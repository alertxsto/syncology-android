import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import {roomApi} from '../../api/rooms';
import {memberApi} from '../../api/members';
import {useAuthContext} from '../../store/auth';
import {Colors} from '../../theme/colors';
import {Typography} from '../../theme/typography';
import {Spacing, Radius} from '../../theme/spacing';
import type {Room, Member} from '../../types';

interface Props {
  room: Room;
  role: string;
  members: Member[];
  onRefresh: () => void;
}

function Section({title, children}: {title: string; children: React.ReactNode}) {
  return (
    <View style={sectionStyles.container}>
      <Text style={sectionStyles.title}>{title}</Text>
      {children}
    </View>
  );
}

export default function RoomInfoTab({room, role, members, onRefresh}: Props) {
  const {user} = useAuthContext();
  const isLeader = role === 'leader';

  const [editName, setEditName] = useState(room.project_name);
  const [editDeadline, setEditDeadline] = useState(
    room.global_deadline?.slice(0, 10) ?? '',
  );
  const [editChatUrl, setEditChatUrl] = useState(room.external_chat_url ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      await roomApi.update({
        roomId: room.id,
        projectName: editName.trim(),
        globalDeadline: editDeadline,
        externalChatUrl: editChatUrl,
        uid: user?.uid ?? '',
        displayName: user?.displayName ?? '',
      });
      onRefresh();
      Alert.alert('Berhasil', 'Informasi room diperbarui');
    } catch (e: any) {
      Alert.alert('Gagal', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEndRoom = () => {
    Alert.alert(
      'Akhiri Room',
      'Yakin ingin mengakhiri room ini? Room akan diarsipkan.',
      [
        {text: 'Batal', style: 'cancel'},
        {
          text: 'Akhiri',
          style: 'destructive',
          onPress: async () => {
            try {
              await roomApi.end({
                roomId: room.id,
                uid: user?.uid ?? '',
                displayName: user?.displayName ?? '',
              });
              onRefresh();
            } catch (e: any) {
              Alert.alert('Gagal', e.message);
            }
          },
        },
      ],
    );
  };

  const handleRemoveMember = (m: Member) => {
    Alert.alert(
      'Keluarkan Anggota',
      `Yakin ingin mengeluarkan ${m.display_name} dari room?`,
      [
        {text: 'Batal', style: 'cancel'},
        {
          text: 'Keluarkan',
          style: 'destructive',
          onPress: async () => {
            try {
              await memberApi.removeMember({
                roomId: room.id,
                memberId: m.id,
                actorUid: user?.uid ?? '',
                actorName: user?.displayName ?? '',
              });
              onRefresh();
            } catch (e: any) {
              Alert.alert('Gagal', e.message);
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>

      {/* Room Code */}
      <Section title="Kode Room">
        <View style={styles.codeBox}>
          <Text style={styles.codeText}>{room.room_code}</Text>
          <Text style={styles.codeSub}>Bagikan kode ini ke anggota tim</Text>
        </View>
      </Section>

      {/* Edit room info — leader only */}
      {isLeader && (
        <Section title="Pengaturan Room">
          <Text style={styles.fieldLabel}>Nama Project</Text>
          <TextInput
            style={styles.input}
            value={editName}
            onChangeText={setEditName}
            placeholderTextColor={Colors.text3}
          />
          <Text style={styles.fieldLabel}>Deadline Global (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={editDeadline}
            onChangeText={setEditDeadline}
            placeholder="2025-12-31"
            placeholderTextColor={Colors.text3}
          />
          <Text style={styles.fieldLabel}>External Chat URL</Text>
          <TextInput
            style={styles.input}
            value={editChatUrl}
            onChangeText={setEditChatUrl}
            placeholder="https://discord.gg/..."
            placeholderTextColor={Colors.text3}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.btnSave, saving && {opacity: 0.5}]}
            onPress={handleSave}
            disabled={saving}>
            {saving ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={styles.btnSaveLabel}>Simpan Perubahan</Text>
            )}
          </TouchableOpacity>
        </Section>
      )}

      {/* External chat link */}
      {room.external_chat_url ? (
        <Section title="External Chat">
          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => Linking.openURL(room.external_chat_url)}>
            <Text style={styles.linkBtnLabel}>Buka Link Chat</Text>
          </TouchableOpacity>
        </Section>
      ) : null}

      {/* Member list */}
      <Section title={`Anggota (${members.length})`}>
        {members.map(m => (
          <View key={m.id} style={styles.memberRow}>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{m.display_name}</Text>
              <Text style={styles.memberMeta}>
                {m.role} · {m.total_pts} pts
              </Text>
            </View>
            {isLeader && m.uid !== user?.uid && (
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => handleRemoveMember(m)}>
                <Text style={styles.removeBtnLabel}>Keluarkan</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </Section>

      {/* End room — leader only */}
      {isLeader && room.is_active && (
        <TouchableOpacity style={styles.dangerBtn} onPress={handleEndRoom}>
          <Text style={styles.dangerBtnLabel}>Akhiri Room</Text>
        </TouchableOpacity>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: Colors.bg0},
  content: {padding: Spacing.base, gap: Spacing.xl, paddingBottom: 60},
  codeBox: {
    backgroundColor: Colors.bg3,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  codeText: {
    fontSize: Typography['3xl'],
    fontWeight: Typography.extrabold,
    color: Colors.blueLight,
    letterSpacing: 6,
    fontFamily: 'monospace',
  },
  codeSub: {fontSize: Typography.sm, color: Colors.text3, marginTop: 4},
  fieldLabel: {
    fontSize: Typography.sm,
    color: Colors.text2,
    fontWeight: Typography.medium,
    marginBottom: 4,
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
    marginBottom: Spacing.xs,
  },
  btnSave: {
    backgroundColor: Colors.blue,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  btnSaveLabel: {
    color: Colors.white,
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
  },
  linkBtn: {
    backgroundColor: Colors.bg3,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  linkBtnLabel: {color: Colors.blueLight, fontSize: Typography.base},
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  memberInfo: {flex: 1},
  memberName: {
    fontSize: Typography.base,
    fontWeight: Typography.medium,
    color: Colors.text1,
  },
  memberMeta: {fontSize: Typography.xs, color: Colors.text3},
  removeBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    backgroundColor: Colors.redDim,
    borderWidth: 1,
    borderColor: Colors.redBorder,
  },
  removeBtnLabel: {
    fontSize: Typography.xs,
    color: Colors.red,
    fontWeight: Typography.medium,
  },
  dangerBtn: {
    backgroundColor: Colors.redDim,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.redBorder,
  },
  dangerBtnLabel: {
    color: Colors.red,
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
  },
});

const sectionStyles = StyleSheet.create({
  container: {gap: Spacing.sm},
  title: {
    fontSize: Typography.xs,
    color: Colors.text3,
    fontWeight: Typography.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
});
