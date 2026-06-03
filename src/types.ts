export interface Message {
  id: string;
  type: 'text' | 'file' | 'image' | 'video' | 'audio' | 'typing' | 'system' | 'call-start' | 'call-response' | 'call-end';
  sender: string;
  time: string;
  payload: string | FilePayload | boolean;
  status: 'sent' | 'received';
}

export interface FilePayload {
  name: string;
  size: number;
  url: string;
  mimeType: string;
}

export interface CallData {
  type: string;
  callId: string;
  callType: 'audio' | 'video' | 'screen';
  callerName: string;
  accepted?: boolean;
}

export interface AppContextType {
  peer: any;
  peerId: string;
  roomId: string;
  userName: string;
  remoteName: string;
  isConnected: boolean;
  connection: any;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  call: any;
  unreadCount: number;
  incomingCallData: CallData | null;
}
