import { useState, useCallback } from 'react';
import { NotificationManager } from '../utils/notifications';

interface UseCallManagerReturn {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callType: 'audio' | 'video' | 'screen' | null;
  isCallActive: boolean;
  startAudioCall: (connection: any, peer: any, roomId: string, userName: string) => Promise<void>;
  startVideoCall: (connection: any, peer: any, roomId: string, userName: string) => Promise<void>;
  startScreenShare: (connection: any, peer: any, roomId: string, userName: string) => Promise<void>;
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleScreen: () => void;
  endCall: () => void;
  setRemoteStream: (stream: MediaStream) => void;
}

export const useCallManager = (): UseCallManagerReturn => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callType, setCallType] = useState<'audio' | 'video' | 'screen' | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);

  const cleanup = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    setLocalStream(null);
    setRemoteStream(null);
    setCallType(null);
    setIsCallActive(false);
  }, [localStream]);

  const startAudioCall = useCallback(async (connection: any, peer: any, roomId: string, userName: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: false 
      });
      setLocalStream(stream);

      const callData = {
        type: 'call-start',
        callId: Math.random().toString(36),
        callType: 'audio',
        callerName: userName
      };

      connection.send(JSON.stringify(callData));
      setCallType('audio');
      setIsCallActive(true);

      setTimeout(() => {
        if (!isCallActive) {
          stream.getTracks().forEach(track => track.stop());
        }
      }, 30000);

    } catch (e: any) {
      console.error('Audio call error:', e);
    }
  }, [isCallActive]);

  const startVideoCall = useCallback(async (connection: any, peer: any, roomId: string, userName: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true,
        video: {
          width: { ideal: 640 },
          height: { ideal: 360 },
          frameRate: { ideal: 24, max: 30 }
        }
      });
      setLocalStream(stream);

      const callData = {
        type: 'call-start',
        callId: Math.random().toString(36),
        callType: 'video',
        callerName: userName
      };

      connection.send(JSON.stringify(callData));
      setCallType('video');
      setIsCallActive(true);

      setTimeout(() => {
        if (!isCallActive) {
          stream.getTracks().forEach(track => track.stop());
        }
      }, 30000);

    } catch (e: any) {
      console.error('Video call error:', e);
    }
  }, [isCallActive]);

  const startScreenShare = useCallback(async (connection: any, peer: any, roomId: string, userName: string) => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: true as any,
        audio: false
      } as any);
      setLocalStream(stream);

      const callData = {
        type: 'call-start',
        callId: Math.random().toString(36),
        callType: 'screen',
        callerName: userName
      };

      connection.send(JSON.stringify(callData));
      setCallType('screen');
      setIsCallActive(true);

      // Handle when user stops sharing
      stream.getTracks()[0].onended = () => {
        cleanup();
      };

      setTimeout(() => {
        if (!isCallActive) {
          stream.getTracks().forEach(track => track.stop());
        }
      }, 30000);

    } catch (e: any) {
      console.error('Screen share error:', e);
    }
  }, [cleanup, isCallActive]);

  const toggleAudio = useCallback(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
    }
  }, [localStream]);

  const toggleVideo = useCallback(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
    }
  }, [localStream]);

  const toggleScreen = useCallback(() => {
    if (localStream && callType === 'screen') {
      cleanup();
    }
  }, [localStream, callType, cleanup]);

  const endCall = useCallback(() => {
    cleanup();
  }, [cleanup]);

  return {
    localStream,
    remoteStream,
    callType,
    isCallActive,
    startAudioCall,
    startVideoCall,
    startScreenShare,
    toggleAudio,
    toggleVideo,
    toggleScreen,
    endCall,
    setRemoteStream
  };
};
