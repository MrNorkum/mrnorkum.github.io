import { useEffect, useRef, useCallback, useState } from 'react';
import Peer from 'peerjs';

interface UsePeerConnectionReturn {
  peer: Peer | null;
  peerId: string;
  isConnected: boolean;
  error: string | null;
  createRoom: () => void;
  joinRoom: (roomId: string) => Promise<any>;
}

export const usePeerConnection = (
  onConnectionOpen: (conn: any) => void
): UsePeerConnectionReturn => {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [peerId, setPeerId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const peerRef = useRef<Peer | null>(null);
  const onConnectionOpenRef = useRef(onConnectionOpen);

  useEffect(() => {
    onConnectionOpenRef.current = onConnectionOpen;
  }, [onConnectionOpen]);

  useEffect(() => {
    if (peerRef.current) return;

    const config: RTCConfiguration = {
      iceServers: [
        { urls: ['stun:stun.l.google.com:19302'] },
        { urls: ['stun:stun1.l.google.com:19302'] },
        { urls: ['stun:stun2.l.google.com:19302'] },
        { urls: ['stun:stun3.l.google.com:19302'] },
      ],
    };

    const newPeer = new Peer({ config });
    peerRef.current = newPeer;
    setPeer(newPeer);

    newPeer.on('open', (id: string) => {
      console.log('✅ PeerJS bağlantısı kuruldu, ID:', id);
      setPeerId(id);
      setIsConnected(true);
      setError(null);
    });

    const handledConnections = new Set<string>();

    newPeer.on('connection', (conn: any) => {
      console.log('✅ Bağlantı isteği geldi:', conn.peer);

      if (handledConnections.has(conn.peer)) {
        console.log('⚠️ Aynı peer zaten işlendi:', conn.peer);
        return;
      }

      handledConnections.add(conn.peer);

      // Eski index.html gibi: connection gelir gelmez kabul et
      onConnectionOpenRef.current(conn);

      conn.on('open', () => {
        console.log('✅ Gelen bağlantı data kanalı açıldı:', conn.peer);
      });

      conn.on('data', (data: any) => {
        console.log('📩 Host data aldı:', data);
      });

      conn.on('close', () => {
        handledConnections.delete(conn.peer);
      });

      conn.on('error', (err: any) => {
        console.error('❌ Gelen bağlantı hatası:', err);
        handledConnections.delete(conn.peer);
      });
    });

    newPeer.on('error', (err: any) => {
      console.error('❌ PeerJS hatası:', err);
      setError(err.message);
    });

    newPeer.on('disconnected', () => {
      console.log('PeerJS bağlantısı koparıldı');
      setIsConnected(false);
    });

    return () => {
      newPeer.destroy();
      peerRef.current = null;
    };
  }, []);

  const createRoom = useCallback(() => {
    console.log('🎉 Oda oluşturuldu, ID:', peerId);
  }, [peerId]);

  const joinRoom = useCallback((roomId: string) => {
    return new Promise<any>((resolve, reject) => {
      const currentPeer = peerRef.current;

      if (!currentPeer) {
        reject(new Error('Peer bağlantısı hazırlanmamış'));
        return;
      }

      const conn = currentPeer.connect(roomId, {
        reliable: true,
        metadata: { userName: 'User' },
      });

      conn.on('open', () => {
        console.log('✅ Odaya bağlanıldı:', roomId);
        onConnectionOpenRef.current(conn);
        resolve(conn);
      });

      conn.on('error', (err: any) => {
        console.error('❌ Bağlantı hatası:', err);
        reject(err);
      });
    });
  }, []);

  return { peer, peerId, isConnected, error, createRoom, joinRoom };
};
