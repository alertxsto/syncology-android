import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useAuthContext} from '../store/auth';
import {roomApi} from '../api/rooms';
import {Colors} from '../theme/colors';
import {Typography} from '../theme/typography';
import {Spacing, Radius} from '../theme/spacing';
import type {Room} from '../types';
import type {MainStackParamList} from '../navigation/MainNavigator';

type Nav = NativeStackNavigationProp<MainStackParamList, 'Home'>;

// ── Create Room Modal ────────────────────────────────────────────
function CreateRoomModal({
  visible,
  uid,
  displayName,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  uid: string;
  displayName: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [projectName, setProjectName] = useState('');
  const [deadline, setDeadline] = useState('');
  const [chatUrl, setChatUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!projectName.trim()) {
      setError('Nama project wajib diisi');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await roomApi.create({
        projectName: projectName.trim(),
        globalDeadline: deadline || null,
        externalChatUrl: chatUrl || null,
        uid,
        displayName,
      });
      setProjectName('');
      setDeadline('');
      setChatUrl('');
      onSuccess();
    } catch (e: any) {
      setError(e.message ?? 'Gagal membuat room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={modalStyles.backdrop}>
        <View style={modalStyles.sheet}>
          <Text style={modalStyles.title}>Buat Room Baru</Text>
          {error ? <Text style={modalStyles.error}>{error}</Text> : null}
          <Text style={modalStyles.label}>Nama Project</Text>
          <TextInput
            style={modalStyles.input}
            value={projectName}
            onChangeText={setProjectName}
            placeholder="contoh: Website Redesign"
            placeholderTextColor={Colors.text3}
          />
          <Text style={modalStyles.label}>Deadline Global (opsional)</Text>
          <TextInput
            style={modalStyles.input}
            value={deadline}
            onChangeText={setDeadline}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Colors.text3}
          />
          <Text style={modalStyles.label}>External Chat URL (opsional)</Text>
          <TextInput
            style={modalStyles.input}
            value={chatUrl}
            onChangeText={setChatUrl}
            placeholder="https://..."
            placeholderTextColor={Colors.text3}
            autoCapitalize="none"
          />
          <View style={modalStyles.actions}>
            <TouchableOpacity style={modalStyles.btnCancel} onPress={onClose}>
              <Text style={modalStyles.btnCancelLabel}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.btnPrimary, loading && {opacity: 0.5}]}
              onPress={handleCreate}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <Text style={modalStyles.btnPrimaryLabel}>Buat Room</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Join Room Modal ──────────────────────────────────────────────
function JoinRoomModal({
  visible,
  uid,
  displayName,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  uid: string;
  displayName: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async () => {
    if (code.trim().length < 4) {
      setError('Kode room tidak valid');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await roomApi.join({roomCode: code.trim(), uid, displayName});
      setCode('');
      onSuccess();
    } catch (e: any) {
      setError(e.message ?? 'Gagal bergabung');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={modalStyles.backdrop}>
        <View style={modalStyles.sheet}>
          <Text style={modalStyles.title}>Gabung dengan Kode</Text>
          {error ? <Text style={modalStyles.error}>{error}</Text> : null}
          <Text style={modalStyles.label}>Kode Room</Text>
          <TextInput
            style={[modalStyles.input, {letterSpacing: 4, textAlign: 'center', fontSize: Typography.lg}]}
            value={code}
            onChangeText={t => setCode(t.toUpperCase())}
            placeholder="ABC123"
            placeholderTextColor={Colors.text3}
            maxLength={8}
            autoCapitalize="characters"
          />
          <View style={modalStyles.actions}>
            <TouchableOpacity style={modalStyles.btnCancel} onPress={onClose}>
              <Text style={modalStyles.btnCancelLabel}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.btnPrimary, loading && {opacity: 0.5}]}
              onPress={handleJoin}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <Text style={modalStyles.btnPrimaryLabel}>Gabung</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Room Card ────────────────────────────────────────────────────
function RoomCard({room, onPress}: {room: Room; onPress: () => void}) {
  const isActive = room.is_active !== false;
  const role = room.my_role ?? 'member';

  return (
    <TouchableOpacity style={cardStyles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={cardStyles.row}>
        <Text style={cardStyles.name} numberOfLines={1}>
          {room.project_name}
        </Text>
        <View style={[cardStyles.badge, role === 'leader' && cardStyles.badgeLeader]}>
          <Text style={cardStyles.badgeLabel}>{role}</Text>
        </View>
      </View>
      <View style={cardStyles.metaRow}>
        <Text style={cardStyles.metaLabel}>Kode</Text>
        <Text style={cardStyles.metaCode}>{room.room_code}</Text>
      </View>
      {room.global_deadline ? (
        <View style={cardStyles.metaRow}>
          <Text style={cardStyles.metaLabel}>Deadline</Text>
          <Text style={cardStyles.metaValue}>
            {room.global_deadline.slice(0, 10)}
          </Text>
        </View>
      ) : null}
      <View style={cardStyles.statusRow}>
        <View
          style={[
            cardStyles.dot,
            {backgroundColor: isActive ? Colors.green : Colors.text3},
          ]}
        />
        <Text style={cardStyles.statusLabel}>{isActive ? 'Active' : 'Ended'}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── HomeScreen ───────────────────────────────────────────────────
export default function HomeScreen() {
  const nav = useNavigation<Nav>();
  const {user, logout} = useAuthContext();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const loadRooms = useCallback(async () => {
    if (!user) return;
    try {
      const data = await roomApi.listMyRooms(user.uid);
      setRooms(data);
    } catch (e: any) {
      Alert.alert('Gagal memuat rooms', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const handleLogout = () => {
    Alert.alert('Keluar', 'Yakin ingin keluar dari Syncology?', [
      {text: 'Batal', style: 'cancel'},
      {text: 'Keluar', style: 'destructive', onPress: logout},
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <ActivityIndicator
          color={Colors.blue}
          size="large"
          style={{marginTop: 60}}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg0} />

      {/* Header */}
      <View style={styles.header}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: Spacing.sm}}>
          <Image
            source={require('../assets/logo.png')}
            style={{width: 32, height: 32}}
            resizeMode="contain"
          />
          <View>
            <Text style={styles.greeting}>
              Halo, {user?.displayName?.split(' ')[0] ?? 'kamu'}
            </Text>
            <Text style={styles.headerSub}>
              {rooms.length} room aktif
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutLabel}>Keluar</Text>
        </TouchableOpacity>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => setShowCreate(true)}>
          <Text style={styles.btnPrimaryLabel}>+ Buat Room</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => setShowJoin(true)}>
          <Text style={styles.btnSecondaryLabel}>Gabung Kode</Text>
        </TouchableOpacity>
      </View>

      {/* Room list */}
      <FlatList
        data={rooms}
        keyExtractor={r => r.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadRooms();
            }}
            tintColor={Colors.blue}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Belum ada room</Text>
            <Text style={styles.emptyBody}>
              Buat room baru atau minta kode dari leader tim.
            </Text>
          </View>
        }
        renderItem={({item}) => (
          <RoomCard
            room={item}
            onPress={() => nav.navigate('Room', {room: item})}
          />
        )}
      />

      <CreateRoomModal
        visible={showCreate}
        uid={user?.uid ?? ''}
        displayName={user?.displayName ?? ''}
        onClose={() => setShowCreate(false)}
        onSuccess={() => {
          setShowCreate(false);
          loadRooms();
        }}
      />
      <JoinRoomModal
        visible={showJoin}
        uid={user?.uid ?? ''}
        displayName={user?.displayName ?? ''}
        onClose={() => setShowJoin(false)}
        onSuccess={() => {
          setShowJoin(false);
          loadRooms();
        }}
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
    paddingTop: Spacing.base,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  greeting: {
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    color: Colors.text1,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: Typography.sm,
    color: Colors.text3,
    marginTop: 2,
  },
  logoutBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  logoutLabel: {
    fontSize: Typography.sm,
    color: Colors.text2,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
  },
  btnPrimary: {
    flex: 1,
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
    flex: 1,
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
  listContent: {
    padding: Spacing.base,
    gap: Spacing.md,
    paddingBottom: 40,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.semibold,
    color: Colors.text2,
  },
  emptyBody: {
    fontSize: Typography.base,
    color: Colors.text3,
    textAlign: 'center',
    lineHeight: 22,
  },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  name: {
    flex: 1,
    fontSize: Typography.md,
    fontWeight: Typography.semibold,
    color: Colors.text1,
    marginRight: Spacing.sm,
  },
  badge: {
    backgroundColor: Colors.bg4,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeLeader: {
    backgroundColor: 'rgba(59,130,246,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.3)',
  },
  badgeLabel: {
    fontSize: Typography.xs,
    color: Colors.text2,
    fontWeight: Typography.medium,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  metaLabel: {
    fontSize: Typography.xs,
    color: Colors.text3,
    width: 56,
  },
  metaCode: {
    fontSize: Typography.sm,
    color: Colors.blueLight,
    fontFamily: 'monospace',
    fontWeight: Typography.semibold,
    letterSpacing: 1,
  },
  metaValue: {
    fontSize: Typography.sm,
    color: Colors.text2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: Typography.xs,
    color: Colors.text3,
  },
});

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.bg2,
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    padding: Spacing['2xl'],
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  title: {
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    color: Colors.text1,
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: Typography.sm,
    color: Colors.text2,
    fontWeight: Typography.medium,
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
  error: {
    color: Colors.red,
    fontSize: Typography.sm,
    backgroundColor: Colors.redDim,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.base,
  },
  btnCancel: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.bg4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btnCancelLabel: {
    color: Colors.text2,
    fontSize: Typography.base,
    fontWeight: Typography.medium,
  },
  btnPrimary: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.blue,
    alignItems: 'center',
  },
  btnPrimaryLabel: {
    color: Colors.white,
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
  },
});
