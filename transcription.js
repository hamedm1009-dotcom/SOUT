const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
export const support = {
  speech: !!SR,
  mic: !!navigator.mediaDevices?.getUserMedia,
  recorder: !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder)
};

/* Transcriber: يلفّ Web Speech API. لاحقًا يمكن إنشاء صنف بنفس الواجهة يتصل بخدمة خارجية عبر Backend. */
export class Transcriber {
  constructor(h) { this.h = h; this.rec = null; this.active = false; this.paused = false; this.stream = null; this.mr = null; this.chunks = []; this.ctx = null; }

  async start({ lang, record }) {
    this.lang = lang; this.active = true; this.paused = false;
    if (record && support.recorder) {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      } catch (e) { this.active = false; throw e; }
      this.chunks = [];
      this.mr = new MediaRecorder(this.stream);
      this.mr.ondataavailable = e => e.data.size && this.chunks.push(e.data);
      this.mr.start(1000);
      this.meter();
    }
    this.startSR();
  }

  startSR() {
    if (!SR || !this.active || this.paused) return;
    const r = new SR();
    r.lang = this.lang; r.continuous = true; r.interimResults = true; r.maxAlternatives = 1;
    r.onstart = () => this.h.state?.('listening');
    r.onresult = e => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const a = e.results[i][0];
        if (e.results[i].isFinal) this.h.final(a.transcript.trim(), a.confidence);
        else interim += a.transcript;
      }
      this.h.interim(interim);
    };
    r.onerror = e => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') this.active = false;
      this.h.error(e.error);
    };
    r.onend = () => {
      this.h.interim('');
      if (this.active && !this.paused) { this.h.state?.('restarting'); setTimeout(() => this.startSR(), 400); }
    };
    this.rec = r;
    try { r.start(); } catch {}
  }

  pause() { this.paused = true; this.rec?.stop(); if (this.mr?.state === 'recording') this.mr.pause(); }
  resume() { this.paused = false; if (this.mr?.state === 'paused') this.mr.resume(); this.startSR(); }

  stop() {
    this.active = false; this.paused = false;
    try { this.rec?.stop(); } catch {}
    cancelAnimationFrame(this.raf); this.ctx?.close?.();
    return new Promise(res => {
      const done = () => { this.stream?.getTracks().forEach(t => t.stop()); this.stream = null; res(this.chunks.length ? new Blob(this.chunks, { type: this.mr.mimeType || 'audio/webm' }) : null); };
      if (this.mr && this.mr.state !== 'inactive') { this.mr.onstop = done; this.mr.stop(); } else done();
    });
  }

  meter() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      const an = this.ctx.createAnalyser(); an.fftSize = 64;
      this.ctx.createMediaStreamSource(this.stream).connect(an);
      const d = new Uint8Array(an.frequencyBinCount);
      const tick = () => { an.getByteFrequencyData(d); this.h.level?.(d); this.raf = requestAnimationFrame(tick); };
      tick();
    } catch {}
  }
}
