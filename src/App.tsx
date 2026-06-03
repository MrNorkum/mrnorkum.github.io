import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { usePeerConnection } from './hooks/usePeerConnection';
import { useMessageHandling } from './hooks/useMessageHandling';
import { useCallManager } from './hooks/useCallManager';
import { StorageManager } from './utils/storage';
import { NotificationManager } from './utils/notifications';
import { FileTransferManager } from './utils/fileTransfer';
import './App.css';

function App() {
  const [userName, setUserName] = useState('Kullanıcı');
  const [remoteName, setRemoteName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('🔴 Bağlanıyor');
  const [dataConnected, setDataConnected] = useState(false);

  const connectionRef = useRef<any>(null);

  const {
    messages,
    addMessage,
    loadMessages,
    unreadCount
  } = useMessageHandling();

  const {
    startAudioCall,
    startVideoCall,
    startScreenShare
  } = useCallManager();

  const handleConnectionOpen = useCallback((conn: any) => {
    connectionRef.current = conn;
    setDataConnected(true);

    const activeRoomId = roomId || conn.peer;
    loadMessages(activeRoomId).catch(console.error);

    conn.on('data', (data: any) => {
      try {
        const message = typeof data === 'string' ? JSON.parse(data) : data;

        if (message.type === 'text') {
          const receivedMessage = {
            ...message,
            status: 'received' as const,
            sender: message.sender || remoteName || 'Remote'
          };

          addMessage(receivedMessage);
          StorageManager.saveMessage(receivedMessage).catch(console.error);
          NotificationManager.playSound('message');
          NotificationManager.show(`${receivedMessage.sender}: ${String(receivedMessage.payload).slice(0, 50)}`);
          NotificationManager.updateBadge(unreadCount + 1);

        } else if (message.type === 'file-start') {
          FileTransferManager.handleFileStart(message);

        } else if (message.type === 'file-chunk') {
          FileTransferManager.handleFileChunk(message);

        } else if (message.type === 'file-end') {
          const fileMsg = FileTransferManager.handleFileEnd(message);

          if (fileMsg) {
            fileMsg.sender = remoteName || 'Remote';
            addMessage(fileMsg);
            StorageManager.saveMessage(fileMsg).catch(console.error);
            NotificationManager.playSound('message');
          }
        }
      } catch (e) {
        console.error('Error parsing message:', e);
      }
    });

    conn.on('close', () => {
      if (connectionRef.current === conn) {
        connectionRef.current = null;
      }

      setDataConnected(false);
      setRemoteName('');
    });

    const name = conn.metadata?.userName || 'Remote';
    setRemoteName(name);

    addMessage({
      id: Math.random().toString(36),
      type: 'system' as const,
      sender: 'System',
      time: new Date().toISOString(),
      payload: `${name} bağlandı`,
      status: 'received' as const
    });
  }, [addMessage, loadMessages, remoteName, roomId, unreadCount]);

  const {
    peer,
    peerId,
    isConnected,
    createRoom,
    joinRoom
  } = usePeerConnection(handleConnectionOpen);

  useEffect(() => {
    StorageManager.init().catch(console.error);

    const handleFirstInteraction = async () => {
      await NotificationManager.requestPermission();
      document.removeEventListener('click', handleFirstInteraction);
    };

    document.addEventListener('click', handleFirstInteraction);

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
    };
  }, []);

  useEffect(() => {
    const savedUserName = localStorage.getItem('peer-chat-username');

    if (savedUserName) {
      setUserName(savedUserName);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');

    if (!roomParam) return;

    const key = `peer-chat-auto-joined:${roomParam}`;

    if (sessionStorage.getItem(key) === '1') return;

    sessionStorage.setItem(key, '1');
    setRoomId(roomParam);
    handleJoinRoom(roomParam);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (dataConnected) {
      setConnectionStatus('✅ Bağlı');
    } else if (roomId || peerId) {
      setConnectionStatus('🟡 Hazır, bağlantı bekliyor');
    } else {
      setConnectionStatus('🔴 Bağlanıyor');
    }
  }, [dataConnected, peerId, roomId]);

  const handleSetUserName = (name: string) => {
    setUserName(name);
    localStorage.setItem('peer-chat-username', name);
  };

  const handleCreateRoom = () => {
    sessionStorage.clear();

    const id = createRoom();

    setRoomId(id);
    setRemoteName('');
    setDataConnected(false);

    const url = `${window.location.origin}${window.location.pathname}?room=${id}`;
    navigator.clipboard.writeText(url).catch(console.error);

    window.history.replaceState(null, '', `?room=${id}`);
  };

  const handleJoinRoom = async (targetRoomId: string) => {
    const cleanRoomId = targetRoomId.trim();

    if (!cleanRoomId) return;

    try {
      setRoomId(cleanRoomId);
      setRemoteName('');
      setDataConnected(false);

      await joinRoom(cleanRoomId);
    } catch (e: any) {
      console.error('Join error:', e);
      alert('Oda katılma hatası: ' + (e?.message || String(e)));
    }
  };

  const handleCopyRoom = () => {
    const id = roomId || peerId;

    if (!id) {
      alert('Henüz oda yok');
      return;
    }

    const url = `${window.location.origin}${window.location.pathname}?room=${id}`;
    navigator.clipboard.writeText(url).catch(console.error);
    alert('Link kopyalandı!');
  };

  const handleSendMessage = (text: string) => {
    if (!connectionRef.current || !connectionRef.current.open) {
      alert('Bağlantı hazır değil');
      return;
    }

    const message = {
      id: Math.random().toString(36),
      type: 'text' as const,
      sender: userName,
      time: new Date().toISOString(),
      payload: text,
      status: 'sent' as const
    };

    connectionRef.current.send(JSON.stringify(message));
    addMessage(message);
    StorageManager.saveMessage(message).catch(console.error);
  };

  const handleSendFile = async (file: File) => {
    if (!connectionRef.current || !connectionRef.current.open) {
      alert('Bağlantı hazır değil');
      return;
    }

    const validation = FileTransferManager.canSendFile(file);

    if (!validation.ok) {
      alert(validation.error);
      return;
    }

    const transfer = FileTransferManager.generateFileTransfer(file);

    for await (const chunk of FileTransferManager.readFileChunks(file, transfer.fileId)) {
      connectionRef.current.send(JSON.stringify(chunk));
    }
  };

  const handleCopyLink = () => {
    handleCopyRoom();
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', height: '100vh' }}>
      <Sidebar
        userName={userName}
        roomId={roomId}
        peerId={roomId || peerId}
        isConnected={dataConnected}
        connectionStatus={connectionStatus}
        onSetUserName={handleSetUserName}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        onCopyRoom={handleCopyRoom}
        onClearHistory={() => StorageManager.clearHistory()}
      />

      <ChatArea
        messages={messages}
        userName={userName}
        remoteName={remoteName}
        isConnected={dataConnected}
        onSendMessage={handleSendMessage}
        onSendFile={handleSendFile}
        onStartAudioCall={() => startAudioCall(connectionRef.current, peer, roomId, userName)}
        onStartVideoCall={() => startVideoCall(connectionRef.current, peer, roomId, userName)}
        onStartScreenShare={() => startScreenShare(connectionRef.current, peer, roomId, userName)}
        onCopyLink={handleCopyLink}
      />
    </div>
  );
}

export default App;
