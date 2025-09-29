import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const playlistResponse = {
  tracks: [
    {
      id: 'track-1',
      title: 'First Song',
      artist: 'Artist A',
      cover: 'cover1.jpg',
      src: 'https://example.com/first.mp3',
      type: 'song',
    },
    {
      id: 'track-2',
      title: 'Second Song',
      artist: 'Artist B',
      cover: 'cover2.jpg',
      src: 'https://example.com/second.mp3',
      type: 'song',
    }
  ],
  config: {
    crossfadeSeconds: 0.5,
  }
};

const translationsResponse = {
  loading: 'Loading...',
  startBtn: 'Start',
  errorPlaylistLoad: 'Error',
  retrying: 'Retrying',
  retryFailed: 'Retry failed',
  playPauseLabel_play: 'Play',
  playPauseLabel_pause: 'Pause',
  songDedicationEmpty: 'Empty',
  songDedicationTime: 'Added: {{timestamp}}'
};

class FakeAudio {
  constructor() {
    this.src = '';
    this.volume = 1;
    this.currentTime = 0;
    this.duration = 30;
    this.paused = true;
    this.crossOrigin = '';
    this.preload = '';
  }

  play() {
    this.paused = false;
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
  }

  addEventListener() {}
  removeEventListener() {}
  load() {}
}

class FakeAudioContext {
  constructor() {
    this.destination = {};
  }

  createAnalyser() {
    return {
      fftSize: 0,
      connect: vi.fn(),
      getByteFrequencyData: vi.fn()
    };
  }

  createMediaElementSource() {
    return {
      connect: vi.fn()
    };
  }

  resume() {
    return Promise.resolve();
  }
}

const createJsonResponse = (body) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  headers: {
    get: () => 'application/json'
  },
  json: async () => body,
  text: async () => JSON.stringify(body)
});

describe('manual track selection crossfade', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();

    document.body.innerHTML = `
      <div id="radio-view"></div>
      <div id="calendar-view"></div>
      <div id="now-playing-section"></div>
      <div id="sticky-player">
        <img id="sticky-track-cover" />
        <div id="sticky-track-title"></div>
        <button id="sticky-play-pause-btn"></button>
        <button id="sticky-next-btn"></button>
      </div>
      <div id="track-info"></div>
      <img id="track-cover" />
      <div id="track-title"></div>
      <div id="track-artist"></div>
      <div id="progress-container"></div>
      <div id="progress-bar"></div>
      <div id="sticky-progress-bar"></div>
      <div id="current-time"></div>
      <div id="time-remaining"></div>
      <button id="play-pause-btn"></button>
      <button id="next-btn"></button>
      <button id="like-btn"></button>
      <div id="like-count"></div>
      <input id="volume-slider" value="0.5" />
      <div id="listener-count"></div>
      <ul id="history-list"></ul>
      <ul id="golden-records-list"></ul>
      <ul id="top-rated-list"></ul>
      <ul id="messages-list"></ul>
      <form id="dj-message-form"><textarea id="dj-message-input"></textarea></form>
      <form id="song-dedication-form">
        <textarea id="song-words-input"></textarea>
        <input id="song-name-input" />
        <ul id="song-dedication-list"></ul>
        <div id="song-dedication-feedback"></div>
      </form>
      <div id="calendar-grid"></div>
      <div id="month-year-display"></div>
      <button id="prev-month-btn"></button>
      <button id="next-month-btn"></button>
      <div id="event-modal"></div>
      <div id="modal-date-display"></div>
      <form id="modal-note-form"></form>
      <select id="modal-name-input"></select>
      <select id="modal-note-input"></select>
      <button id="modal-cancel-btn"></button>
      <div id="modal-feedback"></div>
      <div id="side-panel"></div>
      <button id="menu-toggle"></button>
      <div id="autoplay-overlay"></div>
      <button id="start-btn"></button>
      <canvas id="visualizer-canvas"></canvas>
      <div id="offline-indicator"></div>
      <div id="error-overlay"></div>
      <div id="error-message"></div>
      <button id="error-close-btn"></button>
      <button id="error-retry-btn"></button>
      <div class="theme-switcher"></div>
    `;

    const storage = new Map();
    const localStorageMock = {
      getItem: (key) => storage.has(key) ? storage.get(key) : null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
      clear: () => storage.clear()
    };

    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      configurable: true
    });

    global.fetch = vi.fn((url) => {
      if (typeof url === 'string' && url.includes('playlist.json')) {
        return Promise.resolve(createJsonResponse(playlistResponse));
      }
      if (typeof url === 'string' && url.includes('locales')) {
        return Promise.resolve(createJsonResponse(translationsResponse));
      }
      if (typeof url === 'string' && url.includes('api.php')) {
        return Promise.resolve(createJsonResponse({ fallback: true }));
      }
      return Promise.resolve(createJsonResponse({}));
    });

    global.Audio = FakeAudio;
    window.AudioContext = FakeAudioContext;
    window.webkitAudioContext = FakeAudioContext;
    window.IntersectionObserver = class {
      observe() {}
      disconnect() {}
      unobserve() {}
    };

    Object.defineProperty(window.navigator, 'language', {
      value: 'nl-NL',
      configurable: true
    });
    Object.defineProperty(window.navigator, 'onLine', {
      value: true,
      configurable: true
    });

    window.navigator.serviceWorker = {
      register: vi.fn(() => Promise.resolve({ scope: 'test' })),
      addEventListener: vi.fn()
    };

    await import('../app.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));
    const hooks = window.__radioTestHooks;
    for (let i = 0; i < 10 && hooks.getState().playlist.length === 0; i++) {
      await Promise.resolve();
    }
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('plays the manually selected track after crossfade', async () => {
    const hooks = window.__radioTestHooks;
    const state = hooks.getState();
    const players = hooks.getPlayers();

    state.isInitialized = true;
    state.nextTrack = state.playlist[0];

    hooks.playNextTrack();
    await Promise.resolve();

    const initialActiveIndex = hooks.getActivePlayerIndex();
    const activePlayer = players[initialActiveIndex];
    activePlayer.currentTime = 5;
    activePlayer.duration = 10;
    state.isPlaying = true;
    activePlayer.paused = false;

    const manualTrack = state.playlist[1];
    hooks.playTrackNow(manualTrack);

    expect(state.nextTrack).toBe(manualTrack);
    expect(state.isCrossfading).toBe(true);
    expect(players[1 - initialActiveIndex].src).toBe(manualTrack.src);

    hooks.preloadNextTrack();
    expect(state.nextTrack).toBe(manualTrack);

    await Promise.resolve();
    await vi.advanceTimersByTimeAsync((state.config.crossfadeSeconds || 2) * 1000 + 100);

    const newActiveIndex = hooks.getActivePlayerIndex();
    const newActivePlayer = players[newActiveIndex];

    expect(state.currentTrack.id).toBe(manualTrack.id);
    expect(newActivePlayer.src).toBe(manualTrack.src);
    expect(state.nextTrackIsManual).toBe(false);
  });
});
