import { ChangeEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import Peer, { DataConnection } from 'peerjs';
import './App.css';

type ChatPayload =
  | { kind: 'text'; text: string }
  | {
      kind: 'file';
      name: string;
      size: number;
      mime: string;
      data: string;
      caption?: string;
    };

type ChatMessage = {
  id: string;
  payload: ChatPayload;
  sender: 'me' | 'other' | 'system';
  time: string;
};

type ConnectionState = 'idle' | 'waiting' | 'connecting' | 'connected' | 'error';

const MAX_FILE_SIZE = 25 * 1024 * 1024;

function randomId(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function messageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function now() {
  return new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mime: string, name: string) {
  if (mime.startsWith('image/')) return '🖼️';
  if (mime.startsWith('video/')) return '🎥';
  if (mime.startsWith('audio/')) return '🎵';
  if (mime.includes('pdf')) return '📄';
  if (/\.(zip|rar|7z)$/i.test(name)) return '📦';
  if (/\.(doc|docx)$/i.test(name)) return '📝';
  if (/\.(xls|xlsx)$/i.test(name)) return '📊';
  return '📎';
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Dosya okunamadı.'));
    reader.readAsDataURL(file);
  });
}

function StatusPill({ state, text }: { state: ConnectionState; text: string }) {
  return (
    <div className={`status ${state}`}>
      <span className="status-dot" />
      <span>{text}</span>
    </div>
  );
}

function Sidebar({
  roomId,
  setRoomId,
  activeRoom,
  statusText,
  connectionState,
  onCreateRoom,
  onJoinRoom,
  onClearMessages,
}: {
  roomId: string;
  setRoomId: (value: string) => void;
  activeRoom: string;
  statusText: string;
  connectionState: ConnectionState;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onClearMessages: () => void;
}) {
  async function copyRoom() {
    if (!activeRoom) return;
    await navigator.clipboard?.writeText(activeRoom);
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand">
          <div className="brand-logo">P2P</div>
          <div>
            <h1>Peer Chat</h1>
            <p>Tarayıcı bazlı gizli sohbet</p>
          </div>
        </div>
      </div>

      <section className="room-section">
        <h3>Oda Yönetimi</h3>
        <div className="room-controls">
          <input
            className="room-input"
            value={roomId}
            onChange={(event) => setRoomId(event.target.value.toUpperCase())}
            placeholder="Oda ID'sini girin..."
            maxLength={20}
          />
          <button className="btn btn-primary btn-small" onClick={onJoinRoom}>
            Katıl
          </button>
        </div>
        <button className="btn btn-secondary full" onClick={onCreateRoom}>
          🆕 Yeni Oda Oluştur
        </button>

        {activeRoom && (
          <div className="room-card">
            <div className="room-label">Aktif Oda</div>
            <div className="room-value">{activeRoom}</div>
            <button className="btn btn-ghost full" onClick={copyRoom}>
              📋 Oda ID Kopyala
            </button>
          </div>
        )}

        <StatusPill state={connectionState} text={statusText} />
      </section>

      <div className="sidebar-content">
        <InfoCard title="ℹ️ Bilgi">Bu uygulama PeerJS / WebRTC veri kanalı ile P2P çalışır.</InfoCard>
        <InfoCard title="🔒 Gizlilik">Mesaj ve dosyalar doğrudan karşı tarafa gider; chat sunucuda saklanmaz.</InfoCard>
        <InfoCard title="⚠️ Uyarı">İki taraf aynı anda çevrimiçi olmalıdır. Offline mesaj desteği yoktur.</InfoCard>
      </div>

      <div className="sidebar-footer">
        <button className="btn btn-danger full" onClick={onClearMessages}>
          🗑️ Sohbeti Temizle
        </button>
      </div>
    </aside>
  );
}

function InfoCard({ title, children }: { title: string; children: string }) {
  return (
    <div className="info-card">
      <strong>{title}</strong>
      <p>{children}</p>
    </div>
  );
}

function ChatHeader({ activeRoom, connected }: { activeRoom: string; connected: boolean }) {
  return (
    <header className="chat-header">
      <div className="chat-title-wrap">
        <div className="chat-avatar">💬</div>
        <div>
          <h2>{activeRoom ? `Oda: ${activeRoom}` : 'Peer Chat'}</h2>
          <p>{connected ? '✅ P2P bağlantı açık' : 'Oda oluştur veya mevcut odaya katıl'}</p>
        </div>
      </div>
      <div className="header-actions">
        <button className="circle-btn" disabled title="Sesli arama UI">
          🎤
        </button>
        <button className="circle-btn" disabled title="Görüntülü arama UI">
          📹
        </button>
        <button className="circle-btn purple" disabled title="Ekran paylaşımı UI">
          🖥️
        </button>
      </div>
    </header>
  );
}

function MessageList({ messages }: { messages: ChatMessage[] }) {
  const messagesRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;

    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <main className="messages" ref={messagesRef}>
        <div className="empty-state">
          <div className="empty-icon">💬</div>
          <h3>Henüz mesaj yok</h3>
          <p>Yeni oda oluştur veya var olan odaya katıl. Mesaj, fotoğraf, video, ses veya doküman gönderebilirsin.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="messages" ref={messagesRef}>
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </main>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.sender === 'system') {
    return <div className="system-message">{message.payload.kind === 'text' ? message.payload.text : 'Sistem mesajı'}</div>;
  }

  const mine = message.sender === 'me';

  return (
    <div className={`message-group ${mine ? 'sent' : 'received'}`}>
      {!mine && <div className="avatar small">P</div>}
      <div className="bubble-stack">
        <div className={`message ${mine ? 'sent' : 'received'}`}>
          <PayloadView payload={message.payload} />
        </div>
        <div className="message-time">{message.time}</div>
      </div>
      {mine && <div className="avatar small">B</div>}
    </div>
  );
}

function PayloadView({ payload }: { payload: ChatPayload }) {
  if (payload.kind === 'text') return <span>{payload.text}</span>;

  return (
    <div className="media-content">
      {payload.mime.startsWith('image/') && <img src={payload.data} alt={payload.name} className="media-image" />}
      {payload.mime.startsWith('video/') && <video src={payload.data} controls className="media-video" />}
      {payload.mime.startsWith('audio/') && <audio src={payload.data} controls className="media-audio" />}

      <div className="file-card">
        <div className="file-icon">{fileIcon(payload.mime, payload.name)}</div>
        <div className="file-info">
          <div className="file-name">{payload.name}</div>
          <div className="file-size">{formatBytes(payload.size)} • {payload.mime || 'dosya'}</div>
        </div>
        <a className="download-btn" href={payload.data} download={payload.name}>
          İndir
        </a>
      </div>

      {payload.caption && <div className="caption">{payload.caption}</div>}
    </div>
  );
}

function Composer({
  message,
  setMessage,
  selectedFile,
  onFileSelect,
  onClearFile,
  onSend,
  disabled,
}: {
  message: string;
  setMessage: (value: string) => void;
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
  onClearFile: () => void;
  onSend: () => void;
  disabled: boolean;
}) {
  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    onFileSelect(event.target.files?.[0] ?? null);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') onSend();
  }

  return (
    <footer className="input-area">
      {selectedFile && (
        <div className="preview-bar">
          <span>📎 {selectedFile.name} • {formatBytes(selectedFile.size)}</span>
          <button onClick={onClearFile} aria-label="Dosyayı kaldır">×</button>
        </div>
      )}

      <div className="composer-row">
        <label className="file-input-label" title="Dosya ekle">
          📎
          <input
            type="file"
            onChange={handleFileChange}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
          />
        </label>
        <input
          className="message-input"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? 'Önce odaya bağlan...' : 'Mesajınızı yazın...'}
          disabled={disabled}
        />
        <button className="btn btn-primary send-btn" onClick={onSend} disabled={disabled}>
          📤
        </button>
      </div>
    </footer>
  );
}

export default function App() {
  const peerRef = useRef<Peer | null>(null);
  const connectionRef = useRef<DataConnection | null>(null);

  const [roomId, setRoomId] = useState('');
  const [activeRoom, setActiveRoom] = useState('');
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [statusText, setStatusText] = useState('Bağlantı bekleniyor...');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);

  const connected = useMemo(() => connectionState === 'connected', [connectionState]);

  function addMessage(payload: ChatPayload, sender: ChatMessage['sender']) {
    setMessages((current) => [...current, { id: messageId(), payload, sender, time: now() }]);
  }

  function addSystem(text: string) {
    addMessage({ kind: 'text', text }, 'system');
  }

  function resetPeer() {
    connectionRef.current?.close();
    peerRef.current?.destroy();
    connectionRef.current = null;
    peerRef.current = null;
  }

  function setupConnection(connection: DataConnection, successText: string) {
    connectionRef.current = connection;

    connection.on('open', () => {
      setConnectionState('connected');
      setStatusText(successText);
      addSystem('Bağlantı kuruldu.');
    });

    connection.on('data', (data) => {
      const payload = typeof data === 'string' ? ({ kind: 'text', text: data } as ChatPayload) : (data as ChatPayload);
      addMessage(payload, 'other');
    });

    connection.on('close', () => {
      setConnectionState('error');
      setStatusText('Bağlantı kapandı.');
      addSystem('Bağlantı kapandı.');
    });

    connection.on('error', () => {
      setConnectionState('error');
      setStatusText('Bağlantıda hata oluştu.');
    });
  }

  function createRoom() {
    resetPeer();
    const id = randomId();
    const peer = new Peer(id);
    peerRef.current = peer;
    setActiveRoom(id);
    setRoomId(id);
    setConnectionState('waiting');
    setStatusText('Oda oluşturuluyor...');

    peer.on('open', () => {
      setStatusText(`Oda oluşturuldu: ${id}. Karşı tarafa bu ID'yi gönder.`);
    });

    peer.on('connection', (connection) => setupConnection(connection, 'Bir kullanıcı bağlandı.'));

    peer.on('error', (error) => {
      setConnectionState('error');
      setStatusText(`PeerJS hatası: ${error.type}`);
    });
  }

  function joinRoom() {
    const targetRoom = roomId.trim();
    if (!targetRoom) {
      setConnectionState('error');
      setStatusText('Lütfen Oda ID gir.');
      return;
    }

    resetPeer();
    const peer = new Peer();
    peerRef.current = peer;
    setActiveRoom(targetRoom);
    setConnectionState('connecting');
    setStatusText('Odaya bağlanılıyor...');

    peer.on('open', () => {
      const connection = peer.connect(targetRoom, { reliable: true });
      setupConnection(connection, 'Odaya bağlanıldı.');
    });

    peer.on('error', (error) => {
      setConnectionState('error');
      setStatusText(`PeerJS hatası: ${error.type}`);
    });
  }

  function selectFile(file: File | null) {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      setConnectionState('error');
      setStatusText('Dosya çok büyük. Şimdilik üst limit 25 MB.');
      return;
    }
    setSelectedFile(file);
  }

  async function sendCurrent() {
    const connection = connectionRef.current;
    if (!connection || !connection.open) {
      setConnectionState('error');
      setStatusText('Önce bir odaya bağlanmalısın.');
      return;
    }

    const text = message.trim();
    if (!selectedFile && !text) return;

    try {
      if (selectedFile) {
        const payload: ChatPayload = {
          kind: 'file',
          name: selectedFile.name,
          size: selectedFile.size,
          mime: selectedFile.type || 'application/octet-stream',
          data: await readFileAsDataUrl(selectedFile),
          caption: text,
        };
        connection.send(payload);
        addMessage(payload, 'me');
        setSelectedFile(null);
        setMessage('');
        setStatusText(`Dosya gönderildi: ${selectedFile.name}`);
        setConnectionState('connected');
        return;
      }

      const payload: ChatPayload = { kind: 'text', text };
      connection.send(payload);
      addMessage(payload, 'me');
      setMessage('');
    } catch {
      setConnectionState('error');
      setStatusText('Gönderim sırasında hata oluştu.');
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    selectFile(event.dataTransfer.files?.[0] ?? null);
  }

  return (
    <div
      className={`app-shell ${dragging ? 'dragging' : ''}`}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <Sidebar
        roomId={roomId}
        setRoomId={setRoomId}
        activeRoom={activeRoom}
        statusText={statusText}
        connectionState={connectionState}
        onCreateRoom={createRoom}
        onJoinRoom={joinRoom}
        onClearMessages={() => setMessages([])}
      />

      <section className="main">
        <ChatHeader activeRoom={activeRoom} connected={connected} />
        <MessageList messages={messages} />
        <Composer
          message={message}
          setMessage={setMessage}
          selectedFile={selectedFile}
          onFileSelect={selectFile}
          onClearFile={() => setSelectedFile(null)}
          onSend={sendCurrent}
          disabled={!connected}
        />
      </section>

      {dragging && <div className="drop-zone">📁 Dosyayı bırak</div>}
    </div>
  );
}
