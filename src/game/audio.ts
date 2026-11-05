// Synthesized temple bell + Vietnamese speech for sutra / dharma talk.
let ctx: AudioContext | null = null;
function ac() {
  if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function ringBell(volume = 0.5) {
  const a = ac();
  const now = a.currentTime;
  const master = a.createGain();
  master.gain.value = volume;
  master.connect(a.destination);
  // inharmonic partials of a large bronze bell
  [[110, 1], [220, 0.6], [264, 0.4], [330, 0.35], [440, 0.2], [587, 0.12]].forEach(([f, g]) => {
    const o = a.createOscillator();
    const gn = a.createGain();
    o.type = "sine";
    o.frequency.value = f;
    gn.gain.setValueAtTime(0, now);
    gn.gain.linearRampToValueAtTime(g, now + 0.02);
    gn.gain.exponentialRampToValueAtTime(0.0001, now + 7 + (1 - g) * -3);
    o.connect(gn).connect(master);
    o.start(now);
    o.stop(now + 8);
  });
}

export function woodBlock() {
  const a = ac();
  const now = a.currentTime;
  const o = a.createOscillator();
  const g = a.createGain();
  o.frequency.setValueAtTime(820, now);
  o.frequency.exponentialRampToValueAtTime(500, now + 0.08);
  g.gain.setValueAtTime(0.5, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  o.connect(g).connect(a.destination);
  o.start(now);
  o.stop(now + 0.2);
}

let mokugyo: number | null = null;
export function speak(text: string, onEnd?: () => void) {
  stopSpeak();
  if (!("speechSynthesis" in window)) {
    onEnd?.();
    return false;
  }
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "vi-VN";
  u.rate = 0.8;
  u.pitch = 0.85;
  const vi = speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith("vi"));
  if (vi) u.voice = vi;
  u.onend = () => {
    stopSpeak();
    onEnd?.();
  };
  speechSynthesis.speak(u);
  mokugyo = window.setInterval(woodBlock, 1100);
  return true;
}
export function stopSpeak() {
  if (mokugyo) window.clearInterval(mokugyo);
  mokugyo = null;
  if ("speechSynthesis" in window) speechSynthesis.cancel();
}
