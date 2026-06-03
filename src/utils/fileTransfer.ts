import { Message } from '../types';

const CHUNK_SIZE = 64 * 1024; // 64KB
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

interface FileTransfer {
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  totalChunks: number;
  chunks: ArrayBuffer[];
  receivedChunks: number;
}

const activeTransfers = new Map<string, FileTransfer>();

export const FileTransferManager = {
  CHUNK_SIZE,
  MAX_FILE_SIZE,

  canSendFile(file: File): { ok: boolean; error?: string } {
    if (file.size > MAX_FILE_SIZE) {
      return { ok: false, error: `Dosya çok büyük (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` };
    }
    return { ok: true };
  },

  generateFileTransfer(file: File) {
    const fileId = this.generateUUID();
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    return {
      fileId,
      file,
      totalChunks
    };
  },

  async* readFileChunks(file: File, fileId: string) {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    // Send start metadata
    yield {
      type: 'file-start',
      fileId,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      totalChunks
    };

    // Send chunks
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);
      const buffer = await chunk.arrayBuffer();

      yield {
        type: 'file-chunk',
        fileId,
        chunkIndex: i,
        data: this.arrayBufferToBase64(buffer)
      };
    }

    // Send completion
    yield {
      type: 'file-end',
      fileId
    };
  },

  handleFileStart(msg: any) {
    const transfer: FileTransfer = {
      fileId: msg.fileId,
      fileName: msg.fileName,
      fileSize: msg.fileSize,
      mimeType: msg.mimeType,
      totalChunks: msg.totalChunks,
      chunks: new Array(msg.totalChunks),
      receivedChunks: 0
    };
    activeTransfers.set(msg.fileId, transfer);
  },

  handleFileChunk(msg: any) {
    const transfer = activeTransfers.get(msg.fileId);
    if (!transfer) return;

    transfer.chunks[msg.chunkIndex] = this.base64ToArrayBuffer(msg.data);
    transfer.receivedChunks++;
  },

  handleFileEnd(msg: any): Message | null {
    const transfer = activeTransfers.get(msg.fileId);
    if (!transfer) return null;

    // Combine chunks
    const blob = new Blob(transfer.chunks, { type: transfer.mimeType });
    const url = URL.createObjectURL(blob);

    // Determine media type
    let mediaType = 'file';
    if (transfer.mimeType.startsWith('image/')) {
      mediaType = 'image';
    } else if (transfer.mimeType.startsWith('video/')) {
      mediaType = 'video';
    } else if (transfer.mimeType.startsWith('audio/')) {
      mediaType = 'audio';
    }

    const message: Message = {
      id: this.generateUUID(),
      type: mediaType as any,
      sender: 'Remote',
      time: new Date().toISOString(),
      payload: mediaType === 'file' 
        ? {
            name: transfer.fileName,
            size: transfer.fileSize,
            url,
            mimeType: transfer.mimeType
          }
        : url,
      status: 'received'
    };

    activeTransfers.delete(msg.fileId);
    return message;
  },

  arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  },

  base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  },

  generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
};
