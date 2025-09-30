import { describe, beforeEach, afterEach, test, expect, vi } from 'vitest';

class FakeAudio {
  constructor() {
    this.src = '';
    this.volume = 1;
    this.currentTime = 0;
    this.duration = 0;
    this.paused = true;
    this.crossOrigin = '';
    this.preload = '';
    this._listeners = {};
  }

  play() {
    this.paused = false;
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
  }

  addEventListener(event, callback) {
    if (!this._listeners[event]) {
      this._listeners[event] = [];
    }
    this._listeners[event].push(callback);
  }

  removeEventListener(event, callback) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter((cb) => cb !== callback);
  }

  dispatch(event) {
    if (!this._listeners[event]) return;
    this._listeners[event].forEach((callback) => callback());
  }
}

class FakeAudioContext {
  constructor() {
    this.destination = {};
  }

  createAnalyser() {
    return {
      fftSize: 0,
      frequencyBinCount: 32,
      getByteFrequencyData: () => {},
      connect: () => {},
    };
  }

  createMediaElementSource() {
    return {
      connect: () => {},
    };
  }

  resume() {
    return Promise.resolve();
  }
}

describe('manual crossfade selection', () => {
  const translations = {
    loading: 'Loading...',
    startBtn: 'Start',
    errorPlaylistLoad: 'Error',
    retrying: 'Retrying',
    retryFailed: 'Retry failed',
    playPauseLabel_pause: 'Pause',
    playPauseLabel_play: 'Play',
  };

  const playlistResponse = {
    tracks: [
      { id: 'track-a', title: 'Alpha', artist: 'Artist A', src: 'alpha.mp3', cover: 'alpha.jpg', type: 'song' },
      { id: 'track-b', title: 'Beta', artist: 'Artist B', src: 'beta.mp3', cover: 'beta.jpg', type: 'song' },
      { id: 'track-c', title: 'Gamma', artist: 'Artist C', src: 'gamma.mp3', cover: 'gamma.jpg', type: 'song' },
    ],
    config: {
      crossfadeSeconds: 0.5,
    },
  };

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetModules();

    const fetchMock = vi.fn((input) => {
      const url = typeof input === 'string' ? input : input?.url;
      if (url && url.includes('locales')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve(translations),
          text: () => Promise.resolve(''),
        });
      }
      if (url && url.includes('playlist')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve(playlistResponse),
          text: () => Promise.resolve(''),
        });
      }
      if (url && url.includes('api.php')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({ success: true, data: [] }),
          text: () => Promise.resolve(JSON.stringify({ success: true, data: [] })),
        });
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });

    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('Audio', FakeAudio);
    vi.stubGlobal('AudioContext', FakeAudioContext);
    vi.stubGlobal('webkitAudioContext', FakeAudioContext);

    Object.defineProperty(window, '__ENABLE_TEST_EXPORTS__', {
      configurable: true,
      writable: true,
      value: true,
    });

    window.requestAnimationFrame = vi.fn();

    document.body.innerHTML = `
      <div id="radio-view"></div>
      <div id="calendar-view"></div>
      <button id="start-btn"></button>
      <div id="listener-count"></div>
      <div id="track-info"></div>
      <div id="track-cover"></div>
      <div id="track-title"></div>
      <div id="track-artist"></div>
      <div id="progress-container"></div>
      <div id="progress-bar"></div>
      <div id="sticky-progress-bar"></div>
      <span id="current-time"></span>
      <span id="time-remaining"></span>
    `;

    await import('../app.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));

    await Promise.resolve();
    await Promise.resolve();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.resetModules();
    document.body.innerHTML = '';
    delete window.__radioAppTestExports;
    delete window.__ENABLE_TEST_EXPORTS__;
  });

  test('plays manually selected track after crossfade', async () => {
    const exports = window.__radioAppTestExports;
    expect(exports).toBeDefined();

    const { playTrackNow, preloadNextTrack, getState, getPlayers, getActivePlayerIndex, setActivePlayerIndex } = exports;
    const state = getState();
    const players = getPlayers();

    const initialTrack = state.playlist[0];
    const manualTrack = state.playlist[1];

    state.currentTrack = initialTrack;
    state.isPlaying = true;
    setActivePlayerIndex(0);

    players[0].src = initialTrack.src;
    players[0].currentTime = 5;
    players[0].duration = 10;
    players[0].paused = false;
    players[0].volume = 0.5;
    players[1].volume = 0;

    playTrackNow(manualTrack);

    expect(players[1].src).toBe(manualTrack.src);
    expect(state.nextTrack).toEqual(manualTrack);

    preloadNextTrack();
    expect(state.nextTrack).toEqual(manualTrack);

    await Promise.resolve();
    vi.advanceTimersByTime(1000);

    expect(state.currentTrack).toEqual(manualTrack);
    expect(state.isCrossfading).toBe(false);
    const activePlayer = getPlayers()[getActivePlayerIndex()];
    expect(activePlayer.src).toBe(manualTrack.src);
    expect(activePlayer.paused).toBe(false);
    expect(players[1 - getActivePlayerIndex()].paused).toBe(true);
  });
});
