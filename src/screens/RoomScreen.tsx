/**
 * RoomScreen — container untuk RoomTabNavigator.
 * Mengelola state room, members, dan provide ke semua tabs.
 */

import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack'
import {memberApi} from '../api/members';
import {roomApi} from '../api/rooms';
import {useRealtime} from '../hooks/useRealtime';
import {Colors} from '../theme/colors';
import {Typography} from '../theme/typography';
import {Spacing, Radius} from '../theme/spacing';
import RoomTabNavigator from '../navigation/RoomTabNavigator';
import type {MainStackParamList} from '../navigation/MainNavigator';
import type {Member, Room} from '../types';
import {useAuthContext} from '../store/auth';

type Nav = NativeStackNavigationProp<MainStackParamList, 'Room'>;
type Route = RouteProp<MainStackParamList, 'Room'>;

export default function RoomScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const {user} = useAuthContext();

  const [room, setRoom] = useState<Room>(route.params.room);
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  const myRole = room.my_role ?? 'member';

  const loadMembers = useCallback(async () => {
    try {
      const list = await memberApi.list(room.id);
      setMembers(list);
    } catch (e) {
      console.error('Gagal load members:', e);
    } finally {
      setLoadingMembers(false);
    }
  }, [room.id]);

  const refreshRoom = useCallback(async () => {
    if (!user) return;
    try {
      const rooms = await roomApi.listMyRooms(user.uid);
      const updated = rooms.find(r => r.id === room.id);
      if (updated) setRoom(updated);
    } catch (e) {
      console.error('Gagal refresh room:', e);
    }
    loadMembers();
  }, [user, room.id, loadMembers]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  useRealtime({
    roomId: room.id,
    onMemberChange: loadMembers,
  });

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg0} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => nav.goBack()}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <Text style={styles.backArrow}>{'<'}</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.roomName} numberOfLines={1}>
            {room.project_name}
          </Text>
          <View style={styles.headerMeta}>
            <View
              style={[
                styles.statusDot,
                {backgroundColor: room.is_active ? Colors.green : Colors.text3},
              ]}
            />
            <Text style={styles.headerCode}>{room.room_code}</Text>
            <Text style={styles.headerSep}>·</Text>
            <Text style={styles.headerRole}>{myRole}</Text>
          </View>
        </View>
      </View>

      {loadingMembers ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.blue} />
        </View>
      ) : (
        <RoomTabNavigator
          room={room}
          role={myRole}
          members={members}
          onRefresh={refreshRoom}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: Colors.bg0},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  backBtn: {
    padding: 4,
  },
  backArrow: {
    fontSize: Typography.xl,
    color: Colors.blue,
    fontWeight: Typography.semibold,
  },
  headerCenter: {flex: 1},
  roomName: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.text1,
    letterSpacing: -0.3,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  headerCode: {
    fontSize: Typography.xs,
    color: Colors.blueLight,
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  headerSep: {
    color: Colors.text3,
    fontSize: Typography.xs,
  },
  headerRole: {
    fontSize: Typography.xs,
    color: Colors.text3,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
