export const NotificationManager = {
  hasPermission: false,

  async requestPermission() {
    if (!('Notification' in window)) {
      console.log('Browser does not support notifications');
      return;
    }

    if (Notification.permission === 'granted') {
      this.hasPermission = true;
    } else if (Notification.permission !== 'denied') {
      try {
        const permission = await Notification.requestPermission();
        this.hasPermission = permission === 'granted';
      } catch (e) {
        console.error('Notification permission error:', e);
      }
    }
  },

  show(title: string, options: NotificationOptions = {}) {
    if (!this.hasPermission) return;

    try {
      new Notification(title, {
        icon: '🫐',
        ...options
      });
    } catch (e) {
      console.error('Notification error:', e);
    }
  },

  playSound(type: 'message' | 'call' = 'message') {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = type === 'message' ? 800 : 600;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.error('Audio play error:', e);
    }
  },

  updateBadge(count: number) {
    if (count > 0) {
      document.title = `(${count}) Peer Chat`;
    } else {
      document.title = 'Peer Chat - P2P İletişim';
    }
  }
};
