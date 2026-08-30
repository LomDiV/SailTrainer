/**
 * Sail Training - Web Audio Sound Synthesizer
 * Zero-file acoustic feedback for learning reinforcement.
 */

class SoundEffects {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setEnabled(val) {
        this.enabled = !!val;
    }

    /** Play chime when answer is correct */
    playCorrect() {
        if (!this.enabled) return;
        try {
            this.init();
            if (!this.ctx) return;
            const now = this.ctx.currentTime;

            // Arpeggio note 1 (E5: 659.25Hz)
            this._playTone(659.25, now, 0.12, 'sine', 0.15);
            // Arpeggio note 2 (G#5: 830.61Hz)
            this._playTone(830.61, now + 0.08, 0.14, 'sine', 0.15);
            // Arpeggio note 3 (B5: 987.77Hz)
            this._playTone(987.77, now + 0.16, 0.22, 'sine', 0.18);
        } catch (e) {
            console.warn('Audio playback error:', e);
        }
    }

    /** Play celebration fanfare when question reaches 5/5 mastery */
    playMastery() {
        if (!this.enabled) return;
        try {
            this.init();
            if (!this.ctx) return;
            const now = this.ctx.currentTime;

            // Grand victory fanfare: C5 -> E5 -> G5 -> C6
            const notes = [
                { freq: 523.25, time: 0.00, dur: 0.10 },
                { freq: 659.25, time: 0.10, dur: 0.10 },
                { freq: 783.99, time: 0.20, dur: 0.12 },
                { freq: 1046.50, time: 0.32, dur: 0.45 },
            ];

            for (const n of notes) {
                this._playTone(n.freq, now + n.time, n.dur, 'triangle', 0.2);
            }
        } catch (e) {
            console.warn('Audio playback error:', e);
        }
    }

    /** Play subtle gentle low tone when answer is wrong */
    playWrong() {
        if (!this.enabled) return;
        try {
            this.init();
            if (!this.ctx) return;
            const now = this.ctx.currentTime;

            // Two descending gentle low tones (F#3 -> D3)
            this._playTone(185.00, now, 0.16, 'sawtooth', 0.08);
            this._playTone(146.83, now + 0.14, 0.25, 'sawtooth', 0.07);
        } catch (e) {
            console.warn('Audio playback error:', e);
        }
    }

    /** Play subtle button click tick */
    playTick() {
        if (!this.enabled) return;
        try {
            this.init();
            if (!this.ctx) return;
            this._playTone(1200, this.ctx.currentTime, 0.03, 'sine', 0.03);
        } catch (e) {
            // Ignore tick failures
        }
    }

    _playTone(freq, startTime, duration, type = 'sine', volume = 0.1) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(volume, startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
    }
}

window.soundEffects = new SoundEffects();
