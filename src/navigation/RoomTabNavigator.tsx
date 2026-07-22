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

import {View, Text, StyleSheet} from 'react-native';

function TabIcon({name, focused}: {name: string; focused: boolean}) {
  const color = focused ? Colors.blue : Colors.text3;

  switch (name) {
    case 'overview':
      return (
        <View style={iconStyles.grid}>
          <View style={[iconStyles.gridSquare, {backgroundColor: color}]} />
          <View style={[iconStyles.gridSquare, {backgroundColor: color}]} />
          <View style={[iconStyles.gridSquare, {backgroundColor: color}]} />
          <View style={[iconStyles.gridSquare, {backgroundColor: color}]} />
        </View>
      );
    case 'tasks':
      return (
        <View style={[iconStyles.checkBox, {borderColor: color}]}>
          <Text style={[iconStyles.checkText, {color}]}>✓</Text>
        </View>
      );
    case 'chat':
      return (
        <View style={[iconStyles.chatBubble, {borderColor: color}]}>
          <View style={[iconStyles.chatLine, {backgroundColor: color}]} />
          <View style={[iconStyles.chatLineShort, {backgroundColor: color}]} />
        </View>
      );
    case 'ledger':
      return (
        <View style={iconStyles.chart}>
          <View style={[iconStyles.bar, {height: 8, backgroundColor: color}]} />
          <View style={[iconStyles.bar, {height: 14, backgroundColor: color}]} />
          <View style={[iconStyles.bar, {height: 11, backgroundColor: color}]} />
        </View>
      );
    case 'activity':
      return (
        <View style={iconStyles.pulse}>
          <View style={[iconStyles.pulseDot, {backgroundColor: color}]} />
          <Text style={[iconStyles.pulseSymbol, {color}]}>~</Text>
        </View>
      );
    case 'info':
    default:
      return (
        <View style={[iconStyles.infoCircle, {borderColor: color}]}>
          <Text style={[iconStyles.infoText, {color}]}>i</Text>
        </View>
      );
  }
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
          tabBarIcon: ({focused}) => <TabIcon name="overview" focused={focused} />,
        }}>
        {() => <OverviewTab room={room} role={role} members={members} onRefresh={onRefresh} />}
      </Tab.Screen>
      <Tab.Screen
        name="Tasks"
        options={{
          tabBarLabel: 'Tasks',
          tabBarIcon: ({focused}) => <TabIcon name="tasks" focused={focused} />,
        }}>
        {() => <TasksTab room={room} role={role} members={members} />}
      </Tab.Screen>
      <Tab.Screen
        name="Chat"
        options={{
          tabBarLabel: 'Chat',
          tabBarIcon: ({focused}) => <TabIcon name="chat" focused={focused} />,
        }}>
        {() => <ChatTab room={room} />}
      </Tab.Screen>
      <Tab.Screen
        name="Ledger"
        options={{
          tabBarLabel: 'Ledger',
          tabBarIcon: ({focused}) => <TabIcon name="ledger" focused={focused} />,
        }}>
        {() => <LedgerTab room={room} members={members} />}
      </Tab.Screen>
      <Tab.Screen
        name="Activity"
        options={{
          tabBarLabel: 'Activity',
          tabBarIcon: ({focused}) => <TabIcon name="activity" focused={focused} />,
        }}>
        {() => <ActivityTab room={room} />}
      </Tab.Screen>
      <Tab.Screen
        name="Info"
        options={{
          tabBarLabel: 'Info',
          tabBarIcon: ({focused}) => <TabIcon name="info" focused={focused} />,
        }}>
        {() => <RoomInfoTab room={room} role={role} members={members} onRefresh={onRefresh} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

const iconStyles = StyleSheet.create({
  grid: {
    width: 16,
    height: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridSquare: {
    width: 6,
    height: 6,
    borderRadius: 1,
  },
  checkBox: {
    width: 16,
    height: 16,
    borderWidth: 1.5,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    fontSize: 10,
    fontWeight: 'bold',
    lineHeight: 12,
  },
  chatBubble: {
    width: 18,
    height: 14,
    borderWidth: 1.5,
    borderRadius: 4,
    padding: 2,
    justifyContent: 'center',
    gap: 2,
  },
  chatLine: {
    width: 10,
    height: 1.5,
    borderRadius: 1,
  },
  chatLineShort: {
    width: 6,
    height: 1.5,
    borderRadius: 1,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 16,
    paddingBottom: 1,
  },
  bar: {
    width: 3.5,
    borderRadius: 1,
  },
  pulse: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginRight: 1,
  },
  pulseSymbol: {
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 16,
  },
  infoCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    fontSize: 10,
    fontWeight: 'bold',
    lineHeight: 12,
  },
});
