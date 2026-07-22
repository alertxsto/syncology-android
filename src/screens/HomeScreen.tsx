/**
 * HomeScreen — Total Redesign 1:1 Desktop Parity
 *
 * Menampilkan daftar room pengguna, status aktif, statistik member,
 * serta modal interaktif untuk Buat Room & Gabung Kode.
 */

import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
  Linking,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {roomApi} from '../api/rooms';
import {useAuthContext} from '../store/auth';
import {Colors} from '../theme/colors';
import {Typography} from '../theme/typography';
import {Spacing, Radius} from '../theme/spacing';
import type {MainStackParamList} from '../navigation/MainNavigator';
import type {Room} from '../types';
import {CreateRoomModal} from '../components/CreateRoomModal';
import {JoinRoomModal} from '../components/JoinRoomModal';

type Nav = NativeStackNavigationProp<MainStackParamList, 'Home'>;

function RoomCard({
  room,
  onPress,
}: {
  room: Room;
  onPress: () => void;
}) {
  const isLeader = room.my_role === 'leader';

  const handleOpenExternalChat = (e: any) => {
    e.stopPropagation();
    if (room.external_chat_url) {
      Linking.openURL(room.external_chat_url).catch(() => {
        Alert.alert('Gagal', 'Tidak dapat membuka URL chat eksternal');
      });
    }
  };

  return (
    <TouchableOpacity
      style={cardStyles.card}
      onPress={onPress}
      activeOpacity={0.8}>
      <View style={cardStyles.topRow}>
        <View style={cardStyles.titleContainer}>
          <View
            style={[
              cardStyles.statusDot,
              {backgroundColor: room.is_active ? Colors.green : Colors.text3},
            ]}
          />
          <Text style={cardStyles.projectName} numberOfLines={1}>
            {room.project_name}
          </Text>
        </View>
        <View style={cardStyles.codeBadge}>
          <Text style={cardStyles.codeText}>{room.room_code}</Text>
        </View>
      </View>

      <View style={cardStyles.metaRow}>
        <View style={cardStyles.roleTag}>
          <Text style={[cardStyles.roleText, isLeader && {color: Colors.blueLight}]}>
            {isLeader ? 'Leader' : 'Member'}
          </Text>
        </View>

        {room.global_deadline ? (
          <Text style={cardStyles.deadlineText}>
            Target:{' '}
            {new Date(room.global_deadline).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        ) : (
          <Text style={cardStyles.deadlineText}>Tanpa Target Deadline</Text>
        )}
      </View>

      <View style={cardStyles.footerRow}>
        <Text style={cardStyles.statusText}>
          {room.is_active ? 'Proyek Aktif' : 'Telah Diarsipkan'}
        </Text>

        {room.external_chat_url ? (
          <TouchableOpacity
            style={cardStyles.chatLinkBtn}
            onPress={handleOpenExternalChat}>
            <Text style={cardStyles.chatLinkText}>Chat Link ↗</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const nav = useNavigation<Nav>();
  const {user, logout} = useAuthContext();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  const loadRooms = useCallback(async () => {
    if (!user) return;
    try {
      const data = await roomApi.listMyRooms(user.uid);
      setRooms(data);
    } catch (e: any) {
      Alert.alert('Gagal memuat room', e.message);
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

  const handleCreateRoom = async (data: {
    projectName: string;
    globalDeadline: string | null;
    externalChatUrl: string | null;
  }) => {
    if (!user) return;
    const newRoom = await roomApi.create({
      projectName: data.projectName,
      globalDeadline: data.globalDeadline,
      externalChatUrl: data.externalChatUrl,
      uid: user.uid,
      displayName: user.displayName || 'Pengguna',
    });
    await loadRooms();
    nav.navigate('Room', {room: newRoom});
  };

  const handleJoinRoom = async (code: string) => {
    if (!user) return;
    const joinedRoom = await roomApi.join({
      roomCode: code,
      uid: user.uid,
      displayName: user.displayName || 'Pengguna',
    });
    await loadRooms();
    nav.navigate('Room', {room: joinedRoom});
  };

  const displayName = user?.displayName?.trim()
    ? user.displayName.trim().split(' ')[0]
    : 'Pengguna';

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg0} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerUser}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View>
            <Text style={styles.greeting}>Halo, {displayName}</Text>
            <Text style={styles.headerSub}>{rooms.length} proyek aktif</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Keluar</Text>
        </TouchableOpacity>
      </View>

      {/* Hero Quick Action Bar */}
      <View style={styles.heroActionBar}>
        <TouchableOpacity
          style={styles.btnCreate}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.85}>
          <Text style={styles.btnCreateLabel}>+ Buat Room Baru</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnJoin}
          onPress={() => setShowJoinModal(true)}
          activeOpacity={0.85}>
          <Text style={styles.btnJoinLabel}>Gabung Kode</Text>
        </TouchableOpacity>
      </View>

      {/* Room List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.blue} size="large" />
        </View>
      ) : (
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
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>Belum ada Room Proyek</Text>
              <Text style={styles.emptySub}>
                Buat room baru sebagai Leader atau minta kode unik 6-karakter dari temanmu untuk bergabung!
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
      )}

      {/* Modals */}
      <CreateRoomModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateRoom}
      />
      <JoinRoomModal
        visible={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onSubmit={handleJoinRoom}
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
  headerUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  logo: {
    width: 34,
    height: 34,
  },
  greeting: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: Colors.text1,
  },
  headerSub: {
    fontSize: Typography.xs,
    color: Colors.text3,
  },
  logoutBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.bg3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  logoutText: {
    fontSize: Typography.xs,
    color: Colors.red,
    fontWeight: Typography.semibold,
  },
  heroActionBar: {
    flexDirection: 'row',
    padding: Spacing.base,
    gap: Spacing.sm,
  },
  btnCreate: {
    flex: 1,
    backgroundColor: Colors.blue,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    elevation: 3,
  },
  btnCreateLabel: {
    color: Colors.white,
    fontSize: Typography.base,
    fontWeight: Typography.bold,
  },
  btnJoin: {
    flex: 1,
    backgroundColor: Colors.bg3,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderStrong,
  },
  btnJoinLabel: {
    color: Colors.text1,
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: Spacing.base,
    paddingTop: 0,
    gap: Spacing.sm,
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
  },
  emptyTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.text1,
    marginBottom: Spacing.xs,
  },
  emptySub: {
    fontSize: Typography.sm,
    color: Colors.text3,
    textAlign: 'center',
    lineHeight: 20,
  },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  projectName: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: Colors.text1,
    flex: 1,
  },
  codeBadge: {
    backgroundColor: Colors.bg3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  codeText: {
    fontSize: Typography.xs,
    fontFamily: 'monospace',
    color: Colors.blueLight,
    fontWeight: Typography.semibold,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roleTag: {
    backgroundColor: 'rgba(59,130,246,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  roleText: {
    fontSize: Typography.xs,
    color: Colors.text2,
    fontWeight: Typography.semibold,
  },
  deadlineText: {
    fontSize: Typography.xs,
    color: Colors.text3,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  statusText: {
    fontSize: Typography.xs,
    color: Colors.text3,
  },
  chatLinkBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  chatLinkText: {
    fontSize: Typography.xs,
    color: Colors.blueLight,
    fontWeight: Typography.semibold,
  },
});
