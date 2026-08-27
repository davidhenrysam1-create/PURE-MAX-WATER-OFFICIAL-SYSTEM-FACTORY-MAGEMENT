/**
 * Procedural Audio Chime & Ringtone Generator using HTML5 Web Audio API
 * Generates crisp, low-latency audio notifications for:
 * - Incoming message chime
 * - Manager announcement alert
 * - WebRTC incoming & outgoing call ringtones
 * - Security & Password reset alerts
 * - User gesture auto-unlocking for mobile & desktop browsers
 */

class SoundEffectsEngine {
  private ctx: AudioContext | null = null;
  private ringtoneInterval: NodeJS.Timeout | null = null;
  private isUnlocked: boolean = false;
  private isMuted: boolean = false;

  constructor() {
    // Automatically register user gesture unlock listeners on initialization
    if (typeof window !== 'undefined') {
      const unlock = () => {
        this.unlockAudio();
      };
      window.addEventListener('click', unlock, { once: false, passive: true });
      window.addEventListener('touchstart', unlock, { once: false, passive: true });
      window.addEventListener('keydown', unlock, { once: false, passive: true });
    }
  }

  /**
   * Unlock and resume AudioContext upon first user interaction
   */
  public unlockAudio(): void {
    if (typeof window === 'undefined') return;
    try {
      const ctx = this.getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().then(() => {
          this.isUnlocked = true;
        }).catch(() => {});
      } else if (ctx && ctx.state === 'running') {
        this.isUnlocked = true;
      }
    } catch {
      // Ignored
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return null;

      if (!this.ctx || this.ctx.state === 'closed') {
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
      return null;
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopRingtone();
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Play single synthesized frequency tone
   */
  public playTone(freq: number, type: OscillatorType = 'sine', duration = 0.15, gainVal = 0.18, delay = 0) {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration + 0.05);
    } catch (err) {
      console.warn('Tone play notice:', err);
    }
  }

  /**
   * Play message chime (Pleasant high double chime: D5 -> A5)
   */
  public playMessageChime() {
    this.unlockAudio();
    this.playTone(587.33, 'sine', 0.12, 0.22, 0); // D5
    this.playTone(880.00, 'sine', 0.25, 0.22, 0.09); // A5
  }

  /**
   * Play announcement broadcast chime (Attention triple fanfare: C5 -> E5 -> G5)
   */
  public playAnnouncementFanfare() {
    this.unlockAudio();
    this.playTone(523.25, 'triangle', 0.14, 0.25, 0); // C5
    this.playTone(659.25, 'triangle', 0.14, 0.25, 0.11); // E5
    this.playTone(783.99, 'triangle', 0.38, 0.3, 0.22); // G5
  }

  /**
   * Play security/admin alert chime
   */
  public playSecurityAlert() {
    this.unlockAudio();
    this.playTone(880, 'sawtooth', 0.1, 0.18, 0);
    this.playTone(440, 'sawtooth', 0.25, 0.18, 0.12);
  }

  /**
   * Play call connected sound
   */
  public playCallConnected() {
    this.unlockAudio();
    this.playTone(440, 'sine', 0.08, 0.22, 0);
    this.playTone(554.37, 'sine', 0.08, 0.22, 0.09);
    this.playTone(659.25, 'sine', 0.22, 0.22, 0.18);
  }

  /**
   * Play call hung up / ended tone
   */
  public playCallEnded() {
    this.unlockAudio();
    this.playTone(480, 'sine', 0.15, 0.22, 0);
    this.playTone(320, 'sine', 0.28, 0.22, 0.14);
  }

  /**
   * Start looping phone ringtone for incoming calls (Standard Dual Telecom cadence: 440Hz + 480Hz)
   */
  public startIncomingRingtone() {
    this.unlockAudio();
    this.stopRingtone();
    if (this.isMuted) return;

    const playCadence = () => {
      if (this.isMuted) return;
      // Dual tone ring
      this.playTone(440, 'sine', 0.42, 0.25, 0);
      this.playTone(480, 'sine', 0.42, 0.25, 0);
      this.playTone(440, 'sine', 0.42, 0.25, 0.48);
      this.playTone(480, 'sine', 0.42, 0.25, 0.48);
    };

    playCadence();
    this.ringtoneInterval = setInterval(playCadence, 2600);
  }

  /**
   * Stop active phone ringtone
   */
  public stopRingtone() {
    if (this.ringtoneInterval) {
      clearInterval(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }
  }
}

export const soundEffects = new SoundEffectsEngine();
