import { useEffect, useMemo, useRef, useState } from 'react';
import { ChatHistoryItem, MockChat, TestMessage } from '../../types';
import { ChatMessage } from './ChatMessage';
import { ChatSettings } from './ChatSettings';
import { AddMedia } from './AddMedia';
import { ImageInput } from './ImageInput';
import { readImageFile } from '../../helpers/images';
import { AudioInput } from './AudioInput';
import { ReplyBox } from './ReplyBox';
import { IoSend } from 'react-icons/io5';

export type AudioInputType = {
  audioUrl: string;
  base64String: string;
  mimeType: string;
};

export type DummyChatItem = {
  id: string;
  name: string;
  content: string;
  media?: {
    data: string;
    mimetype: string;
  };
  mediaType?: 'image' | 'audio';
  repliedMessage?: TestMessage;
};

export type ReplyingMessage = {
  message: ChatHistoryItem;
  imageUrl?: string;
};

export const TestChat = () => {
  const [chat, setChat] = useState<MockChat | null>(null);
  const [messages, setMessages] = useState<
    (ChatHistoryItem | DummyChatItem)[] | null
  >(null);
  const [activeUser, setActiveUser] = useState<'user' | 'user2'>('user');
  const [activeMediaInput, setActiveMediaInput] = useState<
    'audio' | 'image' | null
  >(null);
  const [textInput, setTextInput] = useState('');
  const [imageInput, setImageInput] = useState<string | undefined>(undefined);
  const [audioInput, setAudioInput] = useState<AudioInputType | undefined>();
  const [isTyping, setIsTyping] = useState(false);
  const [replyingMessage, setReplyingMessage] =
    useState<ReplyingMessage | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLButtonElement | null>(null);

  const fetchChatData = async () => {
    const response = await fetch('/api/chat');
    if (response.ok) {
      const data = await response.json();
      setChat(data.chat);
      setMessages(data.messages);
    }
  };

  const sendNewMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    let mimeType;
    let imageBase64;
    let audioBase64;

    if (
      imageInputRef.current &&
      imageInputRef.current.files &&
      imageInputRef.current.files[0]
    ) {
      const fileResult = await readImageFile(imageInputRef.current.files[0]);
      mimeType = fileResult.mimeType;
      imageBase64 = fileResult.base64String;
      imageInputRef.current.value = '';
    }
    if (audioInput) {
      mimeType = audioInput.mimeType;
      audioBase64 = audioInput.base64String;
    }

    const hasMedia = imageBase64 || audioBase64;

    const dummyChatItem: DummyChatItem = {
      name: activeUser,
      content: textInput,
      id: '',
      mediaType: imageBase64 ? 'image' : 'audio',
      media: hasMedia
        ? {
            data: imageBase64 || audioBase64 || '',
            mimetype: mimeType || '',
          }
        : undefined,
      repliedMessage: replyingMessage?.message.message,
    };

    const newMessages = messages ? [...messages] : [];
    newMessages.push(dummyChatItem);
    setMessages(newMessages);
    setIsTyping(true);

    const body = {
      message: textInput,
      user: activeUser,
      imageBase64,
      mimeType,
      audioBase64,
      replyingMessageId: replyingMessage?.message.id,
    };
    setTextInput('');
    setImageInput(undefined);
    setActiveMediaInput(null);
    setAudioInput(undefined);
    setReplyingMessage(null);
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      await fetchChatData();
    }
    setIsTyping(false);
  };

  useEffect(() => {
    fetchChatData();
  }, []);

  useEffect(() => {
    const chatMessagesContainer = document.getElementById('chatMessages');
    if (chatMessagesContainer) {
      chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    }
  }, [messages]);

  const isSendDisabled = useMemo(() => {
    return !textInput && !imageInput && !audioInput;
  }, [textInput, imageInput, audioInput]);

  if (!chat || !messages) return null;

  const findMessage = (messageId: string) => {
    return messages.find((msg) => msg.id === messageId);
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h3 id="chat-name">{chat.isGroup ? 'Test Group Chat' : 'Test Chat'}</h3>
        <ChatSettings
          chat={chat}
          messages={messages}
          setChat={setChat}
          setMessages={setMessages}
        />
      </div>
      <div className="chat-messages" id="chatMessages">
        <div id="chatMessagesInner">
          {messages.map((msg) => (
            <ChatMessage
              message={msg}
              isGroup={chat.isGroup}
              key={msg.id}
              findMessage={findMessage}
              replyToMessage={(messageId: string, imageUrl?: string) => {
                const message = messages.find((mess) => mess.id === messageId);
                if (message) {
                  setReplyingMessage({
                    message: message as ChatHistoryItem,
                    imageUrl,
                  });
                }
              }}
            />
          ))}
          {isTyping && (
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          )}
        </div>
      </div>
      <form className="chat-input" id="chatForm" onSubmit={sendNewMessage}>
        {replyingMessage && (
          <ReplyBox
            replyingMessage={replyingMessage}
            closeReplyingMessage={() => setReplyingMessage(null)}
            isActiveReply={true}
          />
        )}
        <div className="chat-input-top" id="chatInputTop">
          {chat.isGroup && (
            <select
              id="userName"
              name="userName"
              value={activeUser}
              onChange={(e) =>
                setActiveUser(e.target.value as 'user' | 'user2')
              }
            >
              <option value="user">User 1</option>
              <option value="user2">User 2</option>
            </select>
          )}
          {activeMediaInput === null && (
            <AddMedia
              imageInputRef={imageInputRef}
              audioInputRef={audioInputRef}
            />
          )}
          {activeMediaInput !== 'audio' && (
            <input
              type="text"
              id="messageInput"
              placeholder="Type your message..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
            />
          )}
          <AudioInput
            audioInput={audioInput}
            setAudioInput={setAudioInput}
            audioInputRef={audioInputRef}
            setActiveMediaInput={setActiveMediaInput}
          />

          <button
            type="submit"
            className={`${
              isSendDisabled ? 'button-disabled' : 'button'
            } send-button`}
            disabled={isSendDisabled}
          >
            <IoSend />
          </button>
        </div>
        <ImageInput
          imageInputRef={imageInputRef}
          imageInput={imageInput}
          setImageInput={setImageInput}
          setActiveMediaInput={setActiveMediaInput}
        />
      </form>
    </div>
  );
};
