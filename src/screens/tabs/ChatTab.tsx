/**
 * ChatTab — Chat Room & Realtime Messaging (1:1 Desktop Parity)
 *
 * Fitur:
 * - Search Message Bar (Pencarian kata kunci & pengirim).
 * - Reply System (Membalas pesan dengan kutipan preview).
 * - Quick Reply Chips (Shortcut pesan cepat).
 * - Sender Avatars dengan inisial pengirim.
 * - Auto Scroll ke pesan terbawah & Live Realtime sync.
 */

import React, {useState, useEffect, useCallback, useRef, useMemo} from 'react';
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
  ScrollView,
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

const QUICK_REPLIES = [
  'Oke, lagi gw kerjain! 🚀',
  'Siap diproses! 👍',
  'Sudah disubmit ke review 📄',
  'Tolong bantu cek dong! 🙏',
];

function MessageBubble({
  msg,
  isMe,
  onReply,
}: {
  msg: ChatMessage;
  isMe: boolean;
  onReply: (msg: ChatMessage) => void;
}) {
  const timeStr = new Date(msg.timestamp).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <TouchableOpacity
      style={[bubbleStyles.wrapper, isMe && bubbleStyles.wrapperMe]}
      onLongPress={() => onReply(msg)}
      activeOpacity={0.85}>
      <View style={bubbleStyles.bubbleRow}>
        {!isMe && (
          <View style={bubbleStyles.avatarCircle}>
            <Text style={bubbleStyles.avatarText}>
              {msg.sender_name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View style={bubbleStyles.bubbleBody}>
          {!isMe && (
            <Text style={bubbleStyles.senderName}>{msg.sender_name}</Text>
          )}

          <View style={[bubbleStyles.bubble, isMe && bubbleStyles.bubbleMe]}>
            {/* Reply Quote Banner */}
            {msg.reply_to_body ? (
              <View style={bubbleStyles.quoteBox}>
                <Text style={bubbleStyles.quoteSender} numberOfLines={1}>
                  {msg.reply_to_sender || 'Pengguna'}
                </Text>
                <Text style={bubbleStyles.quoteBody} numberOfLines={2}>
                  {msg.reply_to_body}
                </Text>
              </View>
            ) : null}

            <Text style={[bubbleStyles.body, isMe && bubbleStyles.bodyMe]}>
              {msg.message_body}
            </Text>

            <Text style={[bubbleStyles.time, isMe && bubbleStyles.timeMe]}>
              {timeStr}
              {msg.edited ? ' (edited)' : ''}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ChatTab({room}: Props) {
  const {user} = useAuthContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const loadMessages = useCallback(async () => {
    try {
      const data = await chatApi.list(room.id);
      setMessages(data);
    } catch (e) {
      console.error('Gagal load messages:', e);
    } finally {
      setLoading(false);
    }
  }, [room.id]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useRealtime({
    roomId: room.id,
    onMessageChange: () => {
      loadMessages().then(() => {
        setTimeout(() => listRef.current?.scrollToEnd({animated: true}), 100);
      });
    },
  });

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase().trim();
    return messages.filter(
      m =>
        m.message_body.toLowerCase().includes(q) ||
        m.sender_name.toLowerCase().includes(q),
    );
  }, [messages, searchQuery]);

  const handleSendMessage = async (textToSend?: string) => {
    const body = (textToSend ?? input).trim();
    if (!body || !user) return;

    setSending(true);
    if (!textToSend) setInput('');

    try {
      await chatApi.send(
        room.id,
        body,
        user.uid,
        user.displayName || 'Pengguna',
        replyTo
          ? {
              message_id: replyTo.id,
              sender_name: replyTo.sender_name,
              message_body: replyTo.message_body,
            }
          : undefined,
      );
      setReplyTo(null);
    } catch (e) {
      console.error('Gagal kirim pesan:', e);
      if (!textToSend) setInput(body);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.blue} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header Search Toggle Bar */}
      <View style={styles.headerBar}>
        {showSearch ? (
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Cari pesan atau nama..."
              placeholderTextColor={Colors.text3}
              autoFocus
            />
            <TouchableOpacity onPress={() => setShowSearch(false)}>
              <Text style={styles.closeSearchText}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.titleRow}>
            <Text style={styles.roomChatTitle}>Diskusi Obrolan Proyek</Text>
            <TouchableOpacity
              style={styles.searchBtn}
              onPress={() => setShowSearch(true)}>
              <Text style={styles.searchBtnText}>🔍 Cari</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Message List */}
      {filteredMessages.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyText}>Belum ada pesan obrolan.</Text>
          <Text style={styles.emptySub}>
            Mulai kirim pesan ke seluruh tim proyek di sini!
          </Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={filteredMessages}
          keyExtractor={m => m.id}
          contentContainerStyle={styles.listContent}
          onLayout={() => listRef.current?.scrollToEnd({animated: false})}
          renderItem={({item}) => (
            <MessageBubble
              msg={item}
              isMe={item.sender_id === user?.uid}
              onReply={setReplyTo}
            />
          )}
        />
      )}

      {/* Quick Reply Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickReplyRow}>
        {QUICK_REPLIES.map((qText, i) => (
          <TouchableOpacity
            key={i}
            style={styles.quickChip}
            onPress={() => handleSendMessage(qText)}>
            <Text style={styles.quickChipText}>{qText}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Reply Quote Banner Bar */}
      {replyTo ? (
        <View style={styles.replyBar}>
          <View style={styles.replyInfo}>
            <Text style={styles.replyTitle}>
              Membalas {replyTo.sender_name}
            </Text>
            <Text style={styles.replySnippet} numberOfLines={1}>
              {replyTo.message_body}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setReplyTo(null)}>
            <Text style={styles.closeReplyBtn}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Input Row */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Tulis pesan obrolan..."
          placeholderTextColor={Colors.text3}
          multiline
          maxLength={2000}
          onSubmitEditing={() => handleSendMessage()}
          returnKeyType="send"
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
          onPress={() => handleSendMessage()}
          disabled={!input.trim() || sending}>
          {sending ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <Text style={styles.sendLabel}>Kirim</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: Colors.bg0},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  headerBar: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.bg1,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roomChatTitle: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: Colors.text1,
  },
  searchBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    backgroundColor: Colors.bg3,
  },
  searchBtnText: {
    fontSize: Typography.xs,
    color: Colors.blueLight,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    backgroundColor: Colors.bg3,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    color: Colors.text1,
    fontSize: Typography.xs,
  },
  closeSearchText: {
    fontSize: Typography.base,
    color: Colors.text3,
    paddingHorizontal: 4,
  },
  listContent: {
    padding: Spacing.base,
    gap: Spacing.xs,
    paddingBottom: Spacing.md,
  },
  quickReplyRow: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
    backgroundColor: Colors.bg1,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  quickChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.bg3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickChipText: {
    fontSize: Typography.xs,
    color: Colors.blueLight,
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.bg3,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.blue,
  },
  replyInfo: {
    flex: 1,
  },
  replyTitle: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.blueLight,
  },
  replySnippet: {
    fontSize: Typography.xs,
    color: Colors.text2,
  },
  closeReplyBtn: {
    fontSize: Typography.base,
    color: Colors.text3,
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
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    color: Colors.text1,
    fontSize: Typography.base,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: Colors.blue,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.bg4,
  },
  sendLabel: {
    color: Colors.white,
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  emptyIcon: {fontSize: 32},
  emptyTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: Colors.text1,
  },
  emptyText: {
    fontSize: Typography.base,
    color: Colors.text1,
    fontWeight: Typography.semibold,
  },
  emptySub: {
    fontSize: Typography.xs,
    color: Colors.text3,
  },
});

const bubbleStyles = StyleSheet.create({
  wrapper: {
    maxWidth: '85%',
    alignSelf: 'flex-start',
    marginVertical: 2,
  },
  wrapperMe: {
    alignSelf: 'flex-end',
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.bg4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarText: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.blueLight,
  },
  bubbleBody: {
    flexShrink: 1,
  },
  senderName: {
    fontSize: Typography.xs,
    color: Colors.text3,
    marginBottom: 2,
    marginLeft: 4,
  },
  bubble: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.lg,
    borderBottomLeftRadius: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  bubbleMe: {
    backgroundColor: 'rgba(59,130,246,0.18)',
    borderColor: 'rgba(59,130,246,0.3)',
    borderBottomLeftRadius: Radius.lg,
    borderBottomRightRadius: 4,
  },
  quoteBox: {
    backgroundColor: Colors.bg3,
    borderRadius: Radius.sm,
    padding: 6,
    borderLeftWidth: 3,
    borderLeftColor: Colors.blue,
    marginBottom: 4,
  },
  quoteSender: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.blueLight,
  },
  quoteBody: {
    fontSize: Typography.xs,
    color: Colors.text2,
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
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  timeMe: {
    color: Colors.blueLight,
    opacity: 0.7,
  },
});
