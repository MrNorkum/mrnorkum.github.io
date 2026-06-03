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

export const usePeerConnection = (onConnectionOpen: (conn: any) => void): UsePeerConnectionReturn => {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [peerId, setPeerId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initPeer = async () => {
      try {
        const config: RTCConfiguration = {
          iceServers: [
            { urls: ['stun:stun.l.google.com:19302'] },
            { urls: ['stun:stun1.l.google.com:19302'] },
            { urls: ['stun:stun2.l.google.com:19302'] },
            { urls: ['stun:stun3.l.google.com:19302'] }
          ]
        };

        const newPeer = new Peer({
          config: config
        });

        newPeer.on('open', (id: string) => {
          console.log('✅ PeerJS bağlantısı kuruldu, ID:', id);
          setPeerId(id);
          setIsConnected(true);
          setError(null);
        });

        newPeer.on('error', (err: any) => {
          console.error('❌ PeerJS hatası:', err);
          setError(err.message);
        });

        newPeer.on('disconnected', () => {
          console.log('PeerJS bağlantısı koparıldı');
          setIsConnected(false);
        });

        newPeer.on('connection', (conn: any) => {
          console.log('✅ Bağlantı başarıyla açıldı:', conn.peer);
          onConnectionOpen(conn);
        });

        setPeer(newPeer);
      } catch (err: any) {
        console.error('PeerJS başlatma hatası:', err);
        setError(err.message);
      }
    };

    initPeer();

    return () => {
      if (peer) {
        peer.destroy();
      }
    };
  }, [onConnectionOpen]);

  const createRoom = useCallback(() => {
    // Room ID is the peer's own ID
    console.log('🎉 Oda oluşturuldu, ID:', peerId);
  }, [peerId]);

  const joinRoom = useCallback((roomId: string) => {
    return new Promise((resolve, reject) => {
      if (!peer) {
        reject(new Error('Peer bağlantısı hazırlanmamış'));
        return;
      }

      const conn = peer.connect(roomId, {
        reliable: true,
        metadata: { userName: 'User' }
      });

      conn.on('open', () => {
        console.log('✅ Odaya bağlanıldı:', roomId);
        onConnectionOpen(conn);
        resolve(conn);
      });

      conn.on('error', (err: any) => {
        console.error('❌ Bağlantı hatası:', err);
        reject(err);
      });
    });
  }, [peer, onConnectionOpen]);

  return {
    peer,
    peerId,
    isConnected,
    error,
    createRoom,
    joinRoom
  };
};
