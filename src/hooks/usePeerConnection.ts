import { useRef, useState, useCallback } from 'react';
import Peer from 'peerjs';

interface UsePeerConnectionReturn {
  peer: Peer | null;
  peerId: string;
  isConnected: boolean;
  error: string | null;
  createRoom: () => string;
  joinRoom: (roomId: string) => Promise<any>;
}

const makeRoomId = () =>
  Math.random().toString(36).substring(2, 8);

export const usePeerConnection = (
  onConnectionOpen: (conn: any) => void
): UsePeerConnectionReturn => {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [peerId, setPeerId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const peerRef = useRef<Peer | null>(null);
  const connectionRef = useRef<any>(null);
  const joiningRef = useRef(false);

  const cleanup = useCallback(() => {
    try {
      if (connectionRef.current) {
        connectionRef.current.close();
      }
    } catch {}

    try {
      if (peerRef.current && !peerRef.current.destroyed) {
        peerRef.current.destroy();
      }
    } catch {}

    connectionRef.current = null;
    peerRef.current = null;

    setPeer(null);
    setPeerId('');
    setIsConnected(false);
  }, []);

  const setupConnection = useCallback((conn: any) => {
    if (connectionRef.current === conn) return;

    connectionRef.current = conn;

    conn.on('open', () => {
      console.log('✅ Data bağlantısı açıldı:', conn.peer);

      setIsConnected(true);
      setError(null);

      onConnectionOpen(conn);
    });

    conn.on('close', () => {
      console.log('🔌 Data bağlantısı kapandı:', conn.peer);

      if (connectionRef.current === conn) {
        connectionRef.current = null;
      }

      setIsConnected(false);
    });

    conn.on('error', (err: any) => {
      console.error('❌ Data bağlantısı hatası:', err);

      setError(err?.message || String(err));
      setIsConnected(false);
    });
  }, [onConnectionOpen]);

  const createRoom = useCallback(() => {
    cleanup();

    const id = makeRoomId();

    const p = new Peer(id);

    peerRef.current = p;

    setPeer(p);
    setPeerId(id);
    setError(null);
    setIsConnected(false);

    p.on('open', (openedId: string) => {
      console.log('✅ Oda oluşturuldu, ID:', openedId);
      setPeerId(openedId);
    });

    p.on('connection', (conn: any) => {
      console.log('✅ Bağlantı isteği geldi:', conn.peer);

      setupConnection(conn);
    });

    p.on('error', (err: any) => {
      console.error('❌ PeerJS hatası:', err);
      setError(err?.message || String(err));
    });

    return id;
  }, [cleanup, setupConnection]);

  const joinRoom = useCallback((roomId: string) => {
    if (joiningRef.current) {
      console.log('⚠️ Join zaten çalışıyor');
      return Promise.reject(new Error('Join zaten çalışıyor'));
    }

    joiningRef.current = true;

    return new Promise<any>((resolve, reject) => {
      cleanup();

      const p = new Peer();

      peerRef.current = p;

      setPeer(p);
      setError(null);
      setIsConnected(false);

      p.on('open', (id: string) => {
        console.log('✅ PeerJS bağlantısı kuruldu, ID:', id);

        setPeerId(id);

        const conn = p.connect(roomId, {
          reliable: true,
          serialization: 'json'
        });

        setupConnection(conn);

        conn.on('open', () => {
          console.log('✅ Odaya bağlanıldı:', roomId);

          joiningRef.current = false;

          resolve(conn);
        });

        conn.on('error', (err: any) => {
          joiningRef.current = false;

          console.error('❌ Bağlantı hatası:', err);

          reject(err);
        });
      });

      p.on('error', (err: any) => {
        joiningRef.current = false;

        console.error('❌ PeerJS hatası:', err);

        reject(err);
      });
    });
  }, [cleanup, setupConnection]);

  return {
    peer,
    peerId,
    isConnected,
    error,
    createRoom,
    joinRoom
  };
};
