/**
 * RoomTabNavigator — bottom tab navigator untuk konten di dalam satu room.
 */

import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Colors} from '../theme/colors';
import {Typography} from '../theme/typography';
import OverviewTab from '../screens/tabs/OverviewTab';
import TasksTab from '../screens/tabs/TasksTab';
import ChatTab from '../screens/tabs/ChatTab';
import LedgerTab from '../screens/tabs/LedgerTab';
import ActivityTab from '../screens/tabs/ActivityTab';
import RoomInfoTab from '../screens/tabs/RoomInfoTab';
import type {Room, Member} from '../types';

export type RoomTabParamList = {
  Overview: undefined;
  Tasks: undefined;
  Chat: undefined;
  Ledger: undefined;
  Activity: undefined;
  Info: undefined;
};

interface Props {
  room: Room;
  role: string;
  members: Member[];
  onRefresh: () => void;
}

// Simple SVG-free icons using Unicode symbols — bisa diganti react-native-vector-icons
function TabIcon({char, focused}: {char: string; focused: boolean}) {
  const {Text} = require('react-native');
  return (
    <Text
      style={{
        fontSize: 18,
        color: focused ? Colors.blue : Colors.text3,
      }}>
      {char}
    </Text>
  );
}

const Tab = createBottomTabNavigator<RoomTabParamList>();

export default function RoomTabNavigator({room, role, members, onRefresh}: Props) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.bg1,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 58,
        },
        tabBarActiveTintColor: Colors.blue,
        tabBarInactiveTintColor: Colors.text3,
        tabBarLabelStyle: {
          fontSize: Typography.xs,
          fontWeight: Typography.medium,
          marginBottom: 2,
        },
      }}>
      <Tab.Screen
        name="Overview"
        options={{
          tabBarLabel: 'Overview',
          tabBarIcon: ({focused}) => <TabIcon char="~" focused={focused} />,
        }}>
        {() => <OverviewTab room={room} role={role} members={members} onRefresh={onRefresh} />}
      </Tab.Screen>
      <Tab.Screen
        name="Tasks"
        options={{
          tabBarLabel: 'Tasks',
          tabBarIcon: ({focused}) => <TabIcon char="+" focused={focused} />,
        }}>
        {() => <TasksTab room={room} role={role} members={members} />}
      </Tab.Screen>
      <Tab.Screen
        name="Chat"
        options={{
          tabBarLabel: 'Chat',
          tabBarIcon: ({focused}) => <TabIcon char="#" focused={focused} />,
        }}>
        {() => <ChatTab room={room} />}
      </Tab.Screen>
      <Tab.Screen
        name="Ledger"
        options={{
          tabBarLabel: 'Ledger',
          tabBarIcon: ({focused}) => <TabIcon char="$" focused={focused} />,
        }}>
        {() => <LedgerTab room={room} members={members} />}
      </Tab.Screen>
      <Tab.Screen
        name="Activity"
        options={{
          tabBarLabel: 'Activity',
          tabBarIcon: ({focused}) => <TabIcon char="!" focused={focused} />,
        }}>
        {() => <ActivityTab room={room} />}
      </Tab.Screen>
      <Tab.Screen
        name="Info"
        options={{
          tabBarLabel: 'Info',
          tabBarIcon: ({focused}) => <TabIcon char="i" focused={focused} />,
        }}>
        {() => <RoomInfoTab room={room} role={role} members={members} onRefresh={onRefresh} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
