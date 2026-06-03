import React, { useState } from 'react';
import { getInitials } from '../utils/helpers';

interface SidebarProps {
  userName: string;
  roomId: string;
  peerId: string;
  isConnected: boolean;
  connectionStatus: string;
  onSetUserName: (name: string) => void;
  onCreateRoom: () => void;
  onJoinRoom: (roomId: string) => void;
  onCopyRoom: () => void;
  onClearHistory: () => void;
  isMobile?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  userName,
  roomId,
  peerId,
  isConnected,
  connectionStatus,
  onSetUserName,
  onCreateRoom,
  onJoinRoom,
  onCopyRoom,
  onClearHistory,
  isMobile,
  onClose
}) => {
  const [newUserName, setNewUserName] = useState(userName);
  const [joinRoomId, setJoinRoomId] = useState('');

  const handleSetUserName = () => {
    if (newUserName.trim()) {
      onSetUserName(newUserName);
    }
  };

  const handleJoinRoom = () => {
    if (joinRoomId.trim()) {
      onJoinRoom(joinRoomId);
      setJoinRoomId('');
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>🫐 Peer Chat</h1>
        <div className="user-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: '#075e54',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold'
            }}>
              {getInitials(userName)}
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{userName || 'Anonim'}</div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                {isConnected ? '🟢 Online' : '🔴 Offline'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              placeholder="Ad gir..."
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #1f2937',
                borderRadius: '6px',
                background: '#0d1929',
                color: '#e5e7eb',
                fontSize: '13px'
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleSetUserName()}
            />
            <button
              onClick={handleSetUserName}
              style={{
                padding: '8px 12px',
                background: '#075e54',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              ✓
            </button>
          </div>
        </div>
      </div>

      <div className="room-section" style={{ padding: '16px', borderBottom: '1px solid #1f2937' }}>
        <h3 style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px', textTransform: 'uppercase' }}>
          Oda Yönetimi
        </h3>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <button
            onClick={onCreateRoom}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: '#075e54',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500'
            }}
          >
            🆕 Yeni Oda
          </button>
        </div>

        {peerId && (
          <div style={{
            marginTop: '12px',
            padding: '12px',
            background: '#0d1929',
            border: '1px solid #1f2937',
            borderRadius: '6px',
            fontSize: '12px'
          }}>
            <div style={{ color: '#9ca3af', marginBottom: '6px' }}>📍 Oda ID</div>
            <div style={{
              fontFamily: 'Courier New, monospace',
              color: '#25a244',
              wordBreak: 'break-all',
              marginBottom: '8px',
              fontSize: '11px'
            }}>
              {peerId}
            </div>
            <button
              onClick={onCopyRoom}
              style={{
                width: '100%',
                padding: '8px',
                background: '#128c7e',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              📋 Kopyala
            </button>
          </div>
        )}

        <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={joinRoomId}
            onChange={(e) => setJoinRoomId(e.target.value)}
            placeholder="Oda ID'sini gir..."
            style={{
              flex: 1,
              padding: '10px 12px',
              border: '1px solid #1f2937',
              borderRadius: '6px',
              background: '#0d1929',
              color: '#e5e7eb',
              fontSize: '13px'
            }}
            onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
          />
          <button
            onClick={handleJoinRoom}
            style={{
              padding: '10px 16px',
              background: '#128c7e',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500'
            }}
          >
            ✓
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <div style={{
          fontSize: '12px',
          lineHeight: '1.6',
          color: '#9ca3af',
          padding: '12px',
          background: '#0d1929',
          borderRadius: '6px',
          marginBottom: '12px'
        }}>
          <strong style={{ color: '#e5e7eb' }}>Nasıl Kullanılır:</strong>
          <br />1. Adını gir ve ✓ tıkla
          <br />2. Yeni Oda oluştur
          <br />3. Oda ID'sini kopyala ve başkasına gönder
          <br />4. Başkası ID'yi girerek katılır
          <br />5. Mesaj gönder, dosya yükle, arama yap!
        </div>

        <div style={{
          fontSize: '12px',
          lineHeight: '1.6',
          color: '#9ca3af',
          padding: '12px',
          background: '#0d1929',
          borderRadius: '6px'
        }}>
          <strong style={{ color: '#e5e7eb' }}>📊 Durum:</strong>
          <br />Bağlantı: {connectionStatus}
          <br />Peer ID: {peerId.substring(0, 8)}...
        </div>
      </div>

      <div style={{ padding: '16px', borderTop: '1px solid #1f2937' }}>
        <button
          onClick={onClearHistory}
          style={{
            width: '100%',
            padding: '10px 16px',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '500'
          }}
        >
          🗑️ Geçmişi Temizle
        </button>
      </div>
    </div>
  );
};
