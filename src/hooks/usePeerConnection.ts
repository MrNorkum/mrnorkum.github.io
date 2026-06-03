import { useRef, useState, useCallback } from 'react';
import Peer from 'peerjs';

interface UsePeerConnectionReturn {
  peer: Peer | null;
  peerId: string;
  isConnected: boolean;
  error: string | null;
  createRoom: () => void;
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
  const handledPeerRef = useRef<string | null>(null);

  const destroyPeer = () => {
    if (peerRef.current && !peerRef.current.destroyed) {
      peerRef.current.destroy();
    }
    peerRef.current = null;
    setPeer(null);
    setPeerId('');
    setIsConnected(false);
    handledPeerRef.current = null;
  };

  const attachIncoming = (p: Peer) => {
    p.on('connection', (conn: any) => {
      console.log('✅ Bağlantı isteği geldi:', conn.peer);

      if (handledPeerRef.current === conn.peer) {
        console.log('⚠️ Aynı peer tekrar geldi, yok sayıldı:', conn.peer);
        return;
      }

      handledPeerRef.current = conn.peer;

      conn.on('open', () => {
        console.log('✅ Gelen bağlantı data kanalı açıldı:', conn.peer);
        setIsConnected(true);
        onConnectionOpen(conn);
      });

      conn.on('data', (data: any) => {
        console.log('📩 Data geldi:', data);
      });

      conn.on('close', () => {
        console.log('🔌 Gelen bağlantı kapandı:', conn.peer);
        setIsConnected(false);
        handledPeerRef.current = null;
      });

      conn.on('error', (err: any) => {
        console.error('❌ Gelen bağlantı hatası:', err);
        setError(err?.message || String(err));
        setIsConnected(false);
        handledPeerRef.current = null;
      });
    });

    p.on('error', (err: any) => {
      console.error('❌ PeerJS hatası:', err);
      setError(err?.message || String(err));
    });
  };

  const createRoom = useCallback(() => {
    destroyPeer();

    const id = makeRoomId();
    const p = new Peer(id);

    peerRef.current = p;
    setPeer(p);
    setPeerId(id);

    p.on('open', (openedId: string) => {
      console.log('✅ Oda oluşturuldu, ID:', openedId);
      setPeerId(openedId);
      setError(null);
    });

    attachIncoming(p);

    return id;
  }, [onConnectionOpen]);

  const joinRoom = useCallback((roomId: string) => {
    return new Promise<any>((resolve, reject) => {
      destroyPeer();

      const p = new Peer();

      peerRef.current = p;
      setPeer(p);

      p.on('open', (id: string) => {
        console.log('✅ PeerJS bağlantısı kuruldu, ID:', id);
        setPeerId(id);
        setError(null);

        const conn = p.connect(roomId, { reliable: true });

        conn.on('open', () => {
          console.log('✅ Odaya bağlanıldı:', roomId);
          setIsConnected(true);
          onConnectionOpen(conn);
          resolve(conn);
        });

        conn.on('close', () => {
          console.log('🔌 Oda bağlantısı kapandı:', roomId);
          setIsConnected(false);
        });

        conn.on('error', (err: any) => {
          console.error('❌ Bağlantı hatası:', err);
          setError(err?.message || String(err));
          setIsConnected(false);
          reject(err);
        });
      });

      p.on('error', (err: any) => {
        console.error('❌ PeerJS hatası:', err);
        setError(err?.message || String(err));
        reject(err);
      });
    });
  }, [onConnectionOpen]);

  return { peer, peerId, isConnected, error, createRoom, joinRoom };
};
