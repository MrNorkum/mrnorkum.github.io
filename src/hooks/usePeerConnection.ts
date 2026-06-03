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

    newPeer.on('connection', (conn: any) => {
      console.log('✅ Bağlantı isteği geldi:', conn.peer);

      const openConnection = () => {
        console.log('✅ Gelen bağlantı kabul edildi:', conn.peer);
        onConnectionOpenRef.current(conn);
      };

      if (conn.open) {
        openConnection();
      } else {
        conn.on('open', openConnection);

        setTimeout(() => {
          if (conn.open) {
            openConnection();
          }
        }, 500);
      }

      conn.on('error', (err: any) => {
        console.error('❌ Gelen bağlantı hatası:', err);
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
