/**
 * Negotiation Notification & Audio Ring Helper
 * Handles audio chime bell ringing, browser desktop notifications,
 * and permission management for real-time customer-admin negotiation alerts.
 */

// Synthesize a luxury bell/chime ring using Web Audio API (no external MP3 file needed)
export const playNegotiationRing = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Harmonic bell chime chords (G5, C6, E6)
    const tones = [
      { freq: 784.0, delay: 0, duration: 1.2, gainVal: 0.3 },
      { freq: 1046.5, delay: 0.08, duration: 1.4, gainVal: 0.35 },
      { freq: 1318.5, delay: 0.16, duration: 1.6, gainVal: 0.4 },
      { freq: 1568.0, delay: 0.24, duration: 1.8, gainVal: 0.25 },
    ];

    tones.forEach(({ freq, delay, duration, gainVal }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);

      // Bell envelope: instant strike, exponential decay
      gain.gain.setValueAtTime(0.0001, now + delay);
      gain.gain.exponentialRampToValueAtTime(gainVal, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + duration);
    });
  } catch (err) {
    console.warn('Audio ring notification playback failed:', err);
  }
};

// Request browser desktop notification permission
export const requestDesktopNotificationPermission = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch {
      return false;
    }
  }
  return false;
};

// Trigger browser desktop notification if tab is in background or minimized
export const sendDesktopNotification = (
  title: string,
  options?: { body?: string; icon?: string; tag?: string },
  onClick?: () => void
) => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    try {
      const notif = new Notification(title, {
        body: options?.body || 'New negotiation message received.',
        icon: options?.icon || '/favicon.ico',
        tag: options?.tag || 'shiuli-negotiation',
      });

      notif.onclick = () => {
        window.focus();
        if (onClick) onClick();
        notif.close();
      };
    } catch (e) {
      console.warn('Desktop notification dispatch error:', e);
    }
  }
};

// Unified trigger for both sound and desktop notification
export const triggerNegotiationAlert = ({
  title,
  body,
  onClick,
}: {
  title: string;
  body: string;
  onClick?: () => void;
}) => {
  // 1. Always play the luxury bell ring
  playNegotiationRing();

  // 2. If user is NOT on website (tab hidden or window minimized) or requested, dispatch desktop notification
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    sendDesktopNotification(title, { body }, onClick);
  }
};
