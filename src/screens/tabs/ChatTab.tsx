import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {chatApi} from '../../api/chat';
import {useRealtime} from '../../hooks/useRealtime';
import {useAuthContext} from '../../store/auth';
import {Colors} from '../../theme/colors';
import {Typography} from '../../theme/typography';
import {Spacing, Radius} from '../../theme/spacing';
import type {Room, ChatMessage} from '../../types';

interface Props {
  room: Room;
}

function MessageBubble({
  msg,
  isMe,
}: {
  msg: ChatMessage;
  isMe: boolean;
}) {
  const time = new Date(msg.timestamp).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={[bubbleStyles.wrapper, isMe && bubbleStyles.wrapperMe]}>
      {!isMe && (
        <Text style={bubbleStyles.senderName}>{msg.sender_name}</Text>
      )}
      <View style={[bubbleStyles.bubble, isMe && bubbleStyles.bubbleMe]}>
        <Text style={[bubbleStyles.body, isMe && bubbleStyles.bodyMe]}>
          {msg.message_body}
        </Text>
      </View>
      <Text style={[bubbleStyles.time, isMe && bubbleStyles.timeMe]}>
        {time}
        {msg.edited ? ' (diedit)' : ''}
      </Text>
    </View>
  );
}

export default function ChatTab({room}: Props) {
  const {user} = useAuthContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    try {
      const data = await chatApi.list(room.id);
      setMessages(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [room.id]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtime({
    roomId: room.id,
    onMessageChange: () => {
      load().then(() => {
        setTimeout(() => listRef.current?.scrollToEnd({animated: true}), 100);
      });
    },
  });

  const sendMessage = async () => {
    const body = input.trim();
    if (!body || !user) return;
    setSending(true);
    setInput('');
    try {
      await chatApi.send(room.id, body, user.uid, user.displayName);
    } catch (e) {
      console.error('Gagal kirim pesan:', e);
      setInput(body);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.blue} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {messages.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Belum ada pesan. Mulai obrolan!</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id}
          contentContainerStyle={styles.listContent}
          onLayout={() => listRef.current?.scrollToEnd({animated: false})}
          renderItem={({item}) => (
            <MessageBubble msg={item} isMe={item.sender_id === user?.uid} />
          )}
        />
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Tulis pesan..."
          placeholderTextColor={Colors.text3}
          multiline
          maxLength={2000}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!input.trim() || sending}>
          <Text style={styles.sendLabel}>Kirim</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: Colors.bg0},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  empty: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  emptyText: {fontSize: Typography.base, color: Colors.text3},
  listContent: {
    padding: Spacing.base,
    gap: 2,
    paddingBottom: Spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.bg1,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.bg3,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    color: Colors.text1,
    fontSize: Typography.base,
    maxHeight: 120,
  },
  sendBtn: {
    backgroundColor: Colors.blue,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.bg4,
  },
  sendLabel: {
    color: Colors.white,
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
  },
});

const bubbleStyles = StyleSheet.create({
  wrapper: {
    maxWidth: '80%',
    alignSelf: 'flex-start',
    marginVertical: 2,
    gap: 2,
  },
  wrapperMe: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  senderName: {
    fontSize: Typography.xs,
    color: Colors.text3,
    marginLeft: 4,
  },
  bubble: {
    backgroundColor: Colors.bg3,
    borderRadius: Radius.lg,
    borderBottomLeftRadius: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bubbleMe: {
    backgroundColor: 'rgba(59,130,246,0.2)',
    borderColor: 'rgba(59,130,246,0.3)',
    borderBottomLeftRadius: Radius.lg,
    borderBottomRightRadius: 4,
  },
  body: {
    fontSize: Typography.base,
    color: Colors.text1,
    lineHeight: 20,
  },
  bodyMe: {
    color: Colors.text1,
  },
  time: {
    fontSize: 10,
    color: Colors.text3,
    marginLeft: 4,
  },
  timeMe: {
    marginLeft: 0,
    marginRight: 4,
  },
});
