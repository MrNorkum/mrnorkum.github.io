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
  const connectionRef = useRef<any>(null);

  const { 
    messages, 
    addMessage, 
    loadMessages, 
    unreadCount, 
    markAsRead 
  } = useMessageHandling();

  const {
    startAudioCall,
    startVideoCall,
    startScreenShare,
    endCall,
    setRemoteStream
  } = useCallManager();

  // Memoize connection open handler
  const handleConnectionOpen = useCallback((conn: any) => {
    connectionRef.current = conn;
    
    loadMessages(conn.peer);

    conn.on('data', (data: any) => {
      try {
        const message = JSON.parse(data);
        
        if (message.type === 'text') {
          addMessage({
            ...message,
            status: 'received',
            sender: remoteName || message.sender
          });
          StorageManager.saveMessage(message);
          NotificationManager.playSound('message');
          NotificationManager.show(`${message.sender}: ${message.payload.slice(0, 50)}`);
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
            StorageManager.saveMessage(fileMsg);
            NotificationManager.playSound('message');
            NotificationManager.show(`${remoteName} sent a file`);
          }
        }
      } catch (e) {
        console.error('Error parsing message:', e);
      }
    });

    conn.on('close', () => {
      connectionRef.current = null;
    });

    if (conn.metadata?.userName) {
      setRemoteName(conn.metadata.userName);
    }

    addMessage({
      id: Math.random().toString(36),
      type: 'system' as const,
      sender: 'System',
      time: new Date().toISOString(),
      payload: `${conn.metadata?.userName || 'User'} bağlandı`,
      status: 'received' as const
    });
  }, [addMessage, loadMessages, remoteName, unreadCount]);

  const { 
    peer, 
    peerId, 
    isConnected, 
    createRoom, 
    joinRoom 
  } = usePeerConnection(handleConnectionOpen);

  // Initialize storage and notifications
  useEffect(() => {
    StorageManager.init();
    
    const handleFirstInteraction = async () => {
      await NotificationManager.requestPermission();
      document.removeEventListener('click', handleFirstInteraction);
    };
    
    document.addEventListener('click', handleFirstInteraction);
    
    return () => {
      document.removeEventListener('click', handleFirstInteraction);
    };
  }, []);

  // Load user name from localStorage
  useEffect(() => {
    const savedUserName = localStorage.getItem('peer-chat-username');
    if (savedUserName) {
      setUserName(savedUserName);
    }
  }, []);

  // Check for room parameter in URL
  useEffect(() => {
    if (!peerId) return;
    
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      handleJoinRoom(roomParam);
    }
  }, [peerId]);

  // Update connection status
  useEffect(() => {
    if (isConnected && connectionRef.current?.open) {
      setConnectionStatus('✅ Bağlı');
    } else if (peerId) {
      setConnectionStatus('🔄 Bağlanıyor');
    } else {
      setConnectionStatus('🔴 Bağlanıyor');
    }
  }, [isConnected, peerId]);

  const handleSetUserName = (name: string) => {
    setUserName(name);
    localStorage.setItem('peer-chat-username', name);
  };

  const handleCreateRoom = () => {
    if (peerId) {
      createRoom();
      setRoomId(peerId);
      navigator.clipboard.writeText(window.location.href.split('?')[0] + `?room=${peerId}`);
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    try {
      await joinRoom(roomId);
    } catch (e: any) {
      console.error('Join error:', e);
      alert('Oda katılma hatası: ' + e.message);
    }
  };

  const handleCopyRoom = () => {
    const url = window.location.href.split('?')[0] + `?room=${peerId}`;
    navigator.clipboard.writeText(url);
    alert('Link kopyalandı!');
  };

  const handleSendMessage = (text: string) => {
    if (!connectionRef.current?.open) {
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
    StorageManager.saveMessage(message);
  };

  const handleSendFile = async (file: File) => {
    if (!connectionRef.current?.open) {
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
    const url = window.location.href.split('?')[0] + `?room=${peerId}`;
    navigator.clipboard.writeText(url);
    alert('Konuşma linki kopyalandı!');
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', height: '100vh' }}>
      <Sidebar
        userName={userName}
        roomId={roomId}
        peerId={peerId}
        isConnected={isConnected}
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
        isConnected={isConnected && connectionRef.current?.open}
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
