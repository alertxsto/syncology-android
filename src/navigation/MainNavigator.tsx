/**
 * MainNavigator — stack navigator untuk seluruh app setelah login.
 */

import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {Colors} from '../theme/colors';
import HomeScreen from '../screens/HomeScreen';
import RoomScreen from '../screens/RoomScreen';
import TaskDetailScreen from '../screens/TaskDetailScreen';
import ProposeTaskScreen from '../screens/ProposeTaskScreen';
import SubmitEvidenceScreen from '../screens/SubmitEvidenceScreen';
import MemberProfileScreen from '../screens/MemberProfileScreen';
import type {Room, Task, Member} from '../types';

export type MainStackParamList = {
  Home: undefined;
  Room: {room: Room};
  TaskDetail: {task: Task; roomId: string; role: string; members: Member[]};
  ProposeTask: {roomId: string; members: Member[]; myUid: string; myMemberId: string};
  SubmitEvidence: {task: Task; roomId: string};
  MemberProfile: {uid: string; roomId: string; displayName: string};
};

const Stack = createNativeStackNavigator<MainStackParamList>();

export default function MainNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {backgroundColor: Colors.bg0},
        animation: 'slide_from_right',
      }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Room" component={RoomScreen} />
      <Stack.Screen
        name="TaskDetail"
        component={TaskDetailScreen}
        options={{animation: 'slide_from_bottom', presentation: 'modal'}}
      />
      <Stack.Screen
        name="ProposeTask"
        component={ProposeTaskScreen}
        options={{animation: 'slide_from_bottom', presentation: 'modal'}}
      />
      <Stack.Screen
        name="SubmitEvidence"
        component={SubmitEvidenceScreen}
        options={{animation: 'slide_from_bottom', presentation: 'modal'}}
      />
      <Stack.Screen
        name="MemberProfile"
        component={MemberProfileScreen}
        options={{animation: 'slide_from_bottom', presentation: 'modal'}}
      />
    </Stack.Navigator>
  );
}
