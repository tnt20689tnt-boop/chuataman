export type SoundId = "music" | "birds" | "water" | "bell" | "mokugyo" | "footsteps";
export interface AudioSettings { enabled: boolean; music: number; nature: number; effects: number }
const DEFAULTS: AudioSettings = { enabled: false, music: 0.42, nature: 0.32, effects: 0.22 };
const KEY = "tam-an-audio-settings";
const SOURCES: Record<SoundId, string> = {
  music: "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/ccCommunity/Jason_Shaw/Audionautix_Acoustic/Jason_Shaw_-_ACOUSTIC_MEDITATION.mp3",
  birds: "https://www.pdsounds.org/audio/download/129/wind_and_birds_singing.mp3",
  water: "https://upload.wikimedia.org/wikipedia/commons/transcoded/2/26/Flowing-water-100019.ogg/Flowing-water-100019.ogg.mp3",
  bell: "https://upload.wikimedia.org/wikipedia/commons/transcoded/f/fa/Gong_or_bell_vibrant.ogg/Gong_or_bell_vibrant.ogg.mp3",
  mokugyo: "https://www.pdsounds.org/audio/download/260/hitting_a_wooden_pole2.mp3",
  footsteps: "https://orangefreesounds.com/wp-content/uploads/2023/10/Gravel-footsteps-sound-effect.mp3"
};
const loops = new Set<SoundId>(["music", "birds", "water"]);
const elements = new Map<SoundId, HTMLAudioElement>();
const listeners = new Set<() => void>();
let settings: AudioSettings = (() => { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return { ...DEFAULTS }; } })();
let speechTimer: number | null = null;
let speechActive = false;
let activeZone = "san";
let chantTimer: number | null = null;
let chantActive = false;
let activeEffect: HTMLAudioElement | null = null;
let zoneWoodTimer: number | null = null;
let zoneBellTimer: number | null = null;
function save() { try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch {} listeners.forEach((fn) => fn()); }
export function getAudioSettings() { return { ...settings }; }
export function subscribeAudioSettings(fn: () => void) { listeners.add(fn); return () => listeners.delete(fn); }
export function updateAudioSettings(patch: Partial<AudioSettings>) { settings = { ...settings, ...patch }; save(); syncLoops(); }
function getAudio(id: SoundId) {
  let el = elements.get(id);
  if (!el) {
    el = new Audio(SOURCES[id]); el.preload = "none"; el.loop = loops.has(id) || id === "footsteps";
    el.addEventListener("error", () => console.warn("[Chùa Tâm An] Lỗi tải âm thanh:", id, el?.currentSrc));
    elements.set(id, el);
  }
  return el;
}
function level(id: SoundId) { return id === "music" ? Math.min(0.58, settings.music * 1.8) : id === "birds" || id === "water" ? Math.min(0.48, settings.nature * 1.8) : settings.effects; }
async function play(id: SoundId, restart = false) {
  if (!settings.enabled) return false;
  const el = getAudio(id); el.volume = Math.max(0, Math.min(1, level(id)));
  if (restart) { el.pause(); el.currentTime = 0; }
  try { await el.play(); return true; } catch (error) { console.warn("[Chùa Tâm An] Trình duyệt từ chối phát:", id, error); return false; }
}
function zoneLoops(zone: string): SoundId[] {
  // Main hall: chanting and ritual sounds only, never background music.
  // Lotus pond: water and birds only, never background music.
  if (zone === "ho") return ["birds", "water"];
  // Instrumental meditation music is reserved for the meditation area.
  if (zone === "thien") return ["music"];
  // Other outdoor/common areas keep only quiet natural ambience.
  if (["cong", "san", "phap", "chuong", "kinh", "giaoluu", "phongsinh"].includes(zone)) return ["birds"];
  return [];
}
function syncLoops() {
  const wanted = new Set(zoneLoops(activeZone));
  (["music", "birds", "water"] as SoundId[]).forEach((id) => {
    const shouldPlay = settings.enabled && wanted.has(id) && level(id) > 0;
    const el = elements.get(id) ?? (shouldPlay ? getAudio(id) : undefined);
    if (!el) return;
    el.volume = level(id) * (speechActive ? 0.24 : 1);
    if (!shouldPlay) el.pause();
    else if (el.paused) void el.play().catch(() => undefined);
  });
}
function stopZoneRitualSounds() {
  if (zoneWoodTimer !== null) window.clearInterval(zoneWoodTimer);
  if (zoneBellTimer !== null) window.clearInterval(zoneBellTimer);
  zoneWoodTimer = null;
  zoneBellTimer = null;
  (["bell", "mokugyo"] as SoundId[]).forEach((id) => {
    const el = elements.get(id);
    if (el) { el.pause(); el.currentTime = 0; }
  });
}
function startZoneRitualSounds() {
  stopZoneRitualSounds();
  if (!settings.enabled || (activeZone !== "dien" && activeZone !== "thien")) return;
  const mainHall = activeZone === "dien";
  const woodVolume = mainHall ? 0.32 : 0.18;
  const bellVolume = mainHall ? 0.42 : 0.3;
  const strikeWood = () => {
    if (!settings.enabled || activeZone !== (mainHall ? "dien" : "thien")) return;
    const el = getAudio("mokugyo");
    el.volume = Math.min(1, woodVolume * settings.effects / DEFAULTS.effects);
    el.pause(); el.currentTime = 0;
    void el.play().catch((error) => console.warn("[Chùa Tâm An] Không phát được tiếng mõ:", error));
  };
  const strikeBell = () => {
    if (!settings.enabled || activeZone !== (mainHall ? "dien" : "thien")) return;
    const el = getAudio("bell");
    el.volume = Math.min(1, bellVolume * settings.effects / DEFAULTS.effects);
    el.pause(); el.currentTime = 0;
    void el.play().catch((error) => console.warn("[Chùa Tâm An] Không phát được tiếng chuông:", error));
  };
  strikeWood();
  zoneWoodTimer = window.setInterval(strikeWood, mainHall ? 2600 : 4200);
  zoneBellTimer = window.setInterval(strikeBell, mainHall ? 32000 : 42000);
  window.setTimeout(() => {
    if (settings.enabled && activeZone === (mainHall ? "dien" : "thien")) strikeBell();
  }, 900);
}
function stopChant() {
  chantActive = false;
  if (chantTimer !== null) window.clearTimeout(chantTimer);
  chantTimer = null;
  if ("speechSynthesis" in window && !speechActive) speechSynthesis.cancel();
}
function startChant() {
  stopChant();
  if (!settings.enabled || activeZone !== "dien" || speechActive || !("speechSynthesis" in window)) return;
  chantActive = true;
  const recite = () => {
    if (!chantActive || !settings.enabled || activeZone !== "dien" || speechActive) return;
    const u = new SpeechSynthesisUtterance("Nam mô A Di Đà Phật");
    u.lang = "vi-VN"; u.rate = 0.72; u.pitch = 0.9; u.volume = 0.68;
    const vi = speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith("vi"));
    if (vi) u.voice = vi;
    u.onend = () => { if (chantActive) chantTimer = window.setTimeout(recite, 2600); };
    u.onerror = () => { if (chantActive) chantTimer = window.setTimeout(recite, 5000); };
    speechSynthesis.speak(u);
  };
  recite();
}
export function setAudioZone(zoneId: string) {
  if (!zoneId || zoneId === activeZone) return;
  activeZone = zoneId;
  stopChant();
  stopZoneRitualSounds();
  syncLoops();
  if (settings.enabled && activeZone === "dien") startChant();
  if (settings.enabled) startZoneRitualSounds();
}
export async function enableAudio() {
  settings.enabled = true;
  save();
  syncLoops();
  if (activeZone === "dien") startChant();
  startZoneRitualSounds();
  return true;
}
export function disableAudio() { settings.enabled = false; save(); stopChant(); stopZoneRitualSounds(); elements.forEach((el) => el.pause()); stopSpeak(); }
export async function playSound(id: SoundId) {
  if (loops.has(id)) { const el = getAudio(id); if (el.paused) return play(id); el.pause(); return false; }
  if (activeEffect && activeEffect !== elements.get(id)) { activeEffect.pause(); activeEffect.currentTime = 0; }
  activeEffect = getAudio(id); return play(id, true);
}
let bellTimer: number | null = null;
export function ringBell(volume = 0.5) {
  if (!settings.enabled) return;
  const el = getAudio("bell");
  if (activeEffect && activeEffect !== el) { activeEffect.pause(); activeEffect.currentTime = 0; }
  activeEffect = el;
  if (bellTimer !== null) window.clearTimeout(bellTimer);
  el.volume = Math.max(0, Math.min(1, volume));
  el.pause(); el.currentTime = 0;
  void el.play().catch((error) => console.warn("[Chùa Tâm An] Không phát được chuông:", error));
  bellTimer = window.setTimeout(() => { el.pause(); el.currentTime = 0; bellTimer = null; }, 9000);
}
export function woodBlock() { void playSound("mokugyo"); }
export function playFootstep() { if (!settings.enabled) return; const el = getAudio("footsteps"); el.volume = Math.min(0.045, settings.effects * 0.12); if (el.paused) void el.play().catch((error) => console.warn("[Chùa Tâm An] Không phát được bước chân:", error)); }
export function stopFootsteps() { const el = elements.get("footsteps"); if (el && !el.paused) { el.pause(); el.currentTime = 0; } }
export function testFootsteps() { if (!settings.enabled) return; playFootstep(); window.setTimeout(stopFootsteps, 2500); }
export function speak(text: string, onEnd?: () => void) {
  stopChant();
  stopSpeak();
  if (!("speechSynthesis" in window)) { onEnd?.(); return false; }
  const u = new SpeechSynthesisUtterance(text); u.lang = "vi-VN"; u.rate = 0.82; u.pitch = 0.9;
  const vi = speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith("vi")); if (vi) u.voice = vi;
  u.onend = () => { stopSpeak(); onEnd?.(); if (settings.enabled && activeZone === "dien") startChant(); }; u.onerror = () => { stopSpeak(); onEnd?.(); if (settings.enabled && activeZone === "dien") startChant(); };
  speechSynthesis.speak(u); speechActive = true; syncLoops();
  speechTimer = window.setInterval(() => { if (speechActive) woodBlock(); }, 1250); return true;
}
export function pauseSpeak() { if ("speechSynthesis" in window) speechSynthesis.pause(); }
export function resumeSpeak() { if ("speechSynthesis" in window) speechSynthesis.resume(); }
export function stopSpeak() { speechActive = false; syncLoops(); syncLoops(); if (speechTimer !== null) clearInterval(speechTimer); speechTimer = null; if ("speechSynthesis" in window) speechSynthesis.cancel(); const el = elements.get("mokugyo"); if (el) { el.pause(); el.currentTime = 0; } }
export async function checkAudioFiles() {
  const result: Record<string, "Đã tải được" | "Không tải được"> = {};
  await Promise.all((Object.keys(SOURCES) as SoundId[]).map(async (id) => {
    const el = getAudio(id);
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = window.setTimeout(() => { cleanup(); reject(new Error("timeout")); }, 10000);
        const done = () => { clearTimeout(timer); cleanup(); resolve(); };
        const fail = () => { clearTimeout(timer); cleanup(); reject(new Error("load error")); };
        const cleanup = () => { el.removeEventListener("canplay", done); el.removeEventListener("error", fail); };
        el.addEventListener("canplay", done, { once: true }); el.addEventListener("error", fail, { once: true }); el.load();
      });
      result[id] = "Đã tải được";
    } catch { result[id] = "Không tải được"; }
  }));
  return result;
}
