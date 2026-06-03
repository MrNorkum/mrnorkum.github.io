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

const makeRoomId = () => Math.random().toString(36).substring(2, 8);

export const usePeerConnection = (
  onConnectionOpen: (conn: any) => void
): UsePeerConnectionReturn => {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [peerId, setPeerId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const peerRef = useRef<Peer | null>(null);
  const connectionRef = useRef<any>(null);

  const destroyPeer = useCallback(() => {
    if (connectionRef.current) {
      try {
        connectionRef.current.close();
      } catch {}
    }

    if (peerRef.current && !peerRef.current.destroyed) {
      peerRef.current.destroy();
    }

    connectionRef.current = null;
    peerRef.current = null;

    setPeer(null);
    setPeerId('');
    setIsConnected(false);
  }, []);

  const bindConnection = useCallback((conn: any) => {
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

  const attachPeerEvents = useCallback((p: Peer) => {
    p.on('connection', (conn: any) => {
      console.log('✅ Bağlantı isteği geldi:', conn.peer);
      bindConnection(conn);
    });

    p.on('disconnected', () => {
      console.log('⚠️ PeerJS signaling bağlantısı koptu');
    });

    p.on('close', () => {
      console.log('🔌 Peer kapandı');
      setIsConnected(false);
    });

    p.on('error', (err: any) => {
      console.error('❌ PeerJS hatası:', err);
      setError(err?.message || String(err));
    });
  }, [bindConnection]);

  const createRoom = useCallback(() => {
    destroyPeer();

    const id = makeRoomId();
    const p = new Peer(id);

    peerRef.current = p;
    setPeer(p);
    setPeerId(id);
    setIsConnected(false);
    setError(null);

    p.on('open', (openedId: string) => {
      console.log('✅ Oda oluşturuldu, ID:', openedId);
      setPeerId(openedId);
    });

    attachPeerEvents(p);

    return id;
  }, [attachPeerEvents, destroyPeer]);

  const joinRoom = useCallback((roomId: string) => {
    return new Promise<any>((resolve, reject) => {
      destroyPeer();

      const p = new Peer();

      peerRef.current = p;
      setPeer(p);
      setIsConnected(false);
      setError(null);

      p.on('open', (id: string) => {
        console.log('✅ PeerJS bağlantısı kuruldu, ID:', id);
        setPeerId(id);

        const conn = p.connect(roomId, {
          reliable: true,
          serialization: 'json'
        });

        bindConnection(conn);

        conn.on('open', () => {
          console.log('✅ Odaya bağlanıldı:', roomId);
          resolve(conn);
        });

        conn.on('error', (err: any) => {
          reject(err);
        });
      });

      attachPeerEvents(p);

      p.on('error', (err: any) => {
        reject(err);
      });
    });
  }, [attachPeerEvents, bindConnection, destroyPeer]);

  return {
    peer,
    peerId,
    isConnected,
    error,
    createRoom,
    joinRoom
  };
};
