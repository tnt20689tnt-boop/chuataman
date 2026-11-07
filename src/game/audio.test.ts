import { afterEach, beforeEach, expect, it, vi } from 'vitest';

let queued: Array<{ onend?: () => void; volume: number }>;
let cancel: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.resetModules(); vi.useFakeTimers(); localStorage.clear(); queued = [];
  cancel = vi.fn(() => { queued = []; });
  vi.stubGlobal('speechSynthesis', { cancel, getVoices: () => [], speak: (u: { volume: number }) => { queued.push(u); } });
  vi.stubGlobal('SpeechSynthesisUtterance', class { volume = 1; constructor(public text: string) {} });
  vi.stubGlobal('Audio', class { paused = true; currentTime = 0; volume = 0; addEventListener() {} pause() { this.paused = true; } play() { this.paused = false; return Promise.resolve(); } });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

it('never queues another chant while the current voice is still speaking', async () => {
  const audio = await import('./audio'); audio.setAudioZone('dien'); await audio.enableAudio();
  expect(queued).toHaveLength(1);
  vi.advanceTimersByTime(60000);
  expect(queued).toHaveLength(1);
  await audio.enableAudio();
  expect(queued).toHaveLength(1);
  audio.disableAudio();
});
it('switches off the chant and clears its pending repeat', async () => {
  const audio = await import('./audio'); audio.setAudioZone('dien'); await audio.enableAudio();
  queued[0]?.onend?.(); audio.disableAudio(); vi.advanceTimersByTime(10000);
  expect(queued).toHaveLength(0);
  expect(audio.getAudioSettings().enabled).toBe(false);
});