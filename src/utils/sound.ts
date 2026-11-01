// Web Audio API synthesized acoustic feedback for tactile antiquity interactions

class SoundEngine {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private getContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public playStoneTap() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(165, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(65, ctx.currentTime + 0.055);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.065);
    } catch {
      // Ignore audio errors
    }
  }

  public playCoinClink() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [2150, 2860].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.045);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.03, now + idx * 0.045 + 0.16);

        gain.gain.setValueAtTime(0.08, now + idx * 0.045);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.045);
        osc.stop(now + idx * 0.045 + 0.19);
      });
    } catch {
      // Ignore
    }
  }

  public playWaxSeal() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.18);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.21);
    } catch {
      // Ignore
    }
  }

  public playOracleChime() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [440, 554.37, 659.25].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0.07, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.46);
      });
    } catch {
      // Ignore
    }
  }
}

export const sound = new SoundEngine();
