import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../types';
import { formatTime, getInitials, formatFileSize } from '../utils/helpers';

interface ChatAreaProps {
  messages: Message[];
  userName: string;
  remoteName: string;
  isConnected: boolean;
  onSendMessage: (text: string) => void;
  onSendFile: (file: File) => void;
  onStartAudioCall: () => void;
  onStartVideoCall: () => void;
  onStartScreenShare: () => void;
  onCopyLink: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  userName,
  remoteName,
  isConnected,
  onSendMessage,
  onSendFile,
  onStartAudioCall,
  onStartVideoCall,
  onStartScreenShare,
  onCopyLink
}) => {
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (messageText.trim()) {
      onSendMessage(messageText);
      setMessageText('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach(file => {
        onSendFile(file);
      });
      e.target.value = '';
    }
  };

  const renderMessageContent = (message: Message) => {
    if (message.type === 'text') {
      return <div>{message.payload as string}</div>;
    } else if (message.type === 'image') {
      return <img src={message.payload as string} alt="shared" style={{ maxWidth: '200px', borderRadius: '8px' }} />;
    } else if (message.type === 'video') {
      return <video src={message.payload as string} controls style={{ maxWidth: '200px', borderRadius: '8px' }} />;
    } else if (message.type === 'audio') {
      return <audio src={message.payload as string} controls style={{ maxWidth: '200px' }} />;
    } else if (message.type === 'file') {
      const payload = message.payload as any;
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>📎 {payload.name}</span>
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>({formatFileSize(payload.size)})</span>
          <a
            href={payload.url}
            download={payload.name}
            style={{
              padding: '4px 8px',
              background: '#075e54',
              color: 'white',
              borderRadius: '4px',
              textDecoration: 'none',
              fontSize: '12px'
            }}
          >
            İndir
          </a>
        </div>
      );
    } else if (message.type === 'typing') {
      return <div style={{ fontStyle: 'italic', color: '#9ca3af' }}>✍️ yazıyor...</div>;
    } else if (message.type === 'system') {
      return <div style={{ fontStyle: 'italic', color: '#9ca3af' }}>{message.payload as string}</div>;
    }
    return <div>{String(message.payload)}</div>;
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: '#0d1929'
    }}>
      {/* Chat Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #1f2937',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h2 style={{ fontSize: '16px', marginBottom: '4px' }}>
            {remoteName || '(kimse bağlı değil)'}
          </h2>
          <p style={{
            fontSize: '12px',
            color: isConnected ? '#10b981' : '#ef4444'
          }}>
            {isConnected ? '🟢 Bağlı' : '🔴 Bağlantı Kesildi'}
          </p>
        </div>
        <button
          onClick={onCopyLink}
          style={{
            padding: '8px 16px',
            background: '#075e54',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px'
          }}
        >
          🔗 Linki Kopyala
        </button>
      </div>

      {/* Messages Container */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {messages.length === 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#9ca3af',
            textAlign: 'center'
          }}>
            <div>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
              <div>Henüz bir mesaj yok</div>
              <div style={{ fontSize: '12px', marginTop: '8px' }}>
                Birisini davet et veya bir oda kodunu gir!
              </div>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              justifyContent: msg.status === 'sent' ? 'flex-end' : 'flex-start',
              marginBottom: '8px'
            }}
          >
            <div style={{
              display: 'flex',
              gap: '8px',
              maxWidth: '70%',
              alignItems: 'flex-end'
            }}>
              {msg.status === 'received' && (
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#075e54',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  flexShrink: 0
                }}>
                  {getInitials(msg.sender)}
                </div>
              )}

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                {msg.status === 'received' && (
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>{msg.sender}</div>
                )}
                <div style={{
                  background: msg.status === 'sent' ? '#056162' : '#1a2332',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  wordBreak: 'break-word',
                  color: '#e5e7eb'
                }}>
                  {renderMessageContent(msg)}
                </div>
                <div style={{fontSize: '11px', color: '#9ca3af'}}>
                  {formatTime(new Date(msg.time))}
                </div>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Call Buttons */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid #1f2937',
        display: 'flex',
        gap: '8px',
        backgroundColor: '#111b3f'
      }}>
        <button
          onClick={onStartAudioCall}
          disabled={!isConnected}
          style={{
            padding: '10px 16px',
            background: isConnected ? '#075e54' : '#666',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: isConnected ? 'pointer' : 'not-allowed',
            fontSize: '13px'
          }}
        >
          📞 Ses
        </button>
        <button
          onClick={onStartVideoCall}
          disabled={!isConnected}
          style={{
            padding: '10px 16px',
            background: isConnected ? '#075e54' : '#666',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: isConnected ? 'pointer' : 'not-allowed',
            fontSize: '13px'
          }}
        >
          📹 Video
        </button>
        <button
          onClick={onStartScreenShare}
          disabled={!isConnected}
          style={{
            padding: '10px 16px',
            background: isConnected ? '#075e54' : '#666',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: isConnected ? 'pointer' : 'not-allowed',
            fontSize: '13px'
          }}
        >
          🖥️ Ekran
        </button>
      </div>

      {/* Message Input */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid #1f2937',
        backgroundColor: '#111b3f'
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <label style={{
            padding: '10px 16px',
            background: '#075e54',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '500'
          }}>
            📎 Dosya
            <input
              type="file"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              multiple
              disabled={!isConnected}
            />
          </label>

          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Mesaj yaz... (Shift+Enter çok satır)"
            disabled={!isConnected}
            style={{
              flex: 1,
              padding: '10px 12px',
              border: '1px solid #1f2937',
              borderRadius: '6px',
              background: '#0d1929',
              color: '#e5e7eb',
              fontSize: '13px',
              fontFamily: 'inherit',
              minHeight: '40px',
              maxHeight: '100px',
              resize: 'vertical'
            }}
          />

          <button
            onClick={handleSendMessage}
            disabled={!isConnected || !messageText.trim()}
            style={{
              padding: '10px 16px',
              background: isConnected ? '#128c7e' : '#666',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isConnected ? 'pointer' : 'not-allowed',
              fontSize: '13px',
              fontWeight: '500'
            }}
          >
            ✉️ Gönder
          </button>
        </div>
      </div>
    </div>
  );
};
