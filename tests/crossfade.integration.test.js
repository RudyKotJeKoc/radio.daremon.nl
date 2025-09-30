import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const translationsResponse = {
  loading: 'Laden...',
  startBtn: 'Start Radio',
  errorPlaylistLoad: 'Fout bij laden playlist',
  errorTimeout: 'Timeout',
  retrying: 'Opnieuw proberen...',
  retryFailed: 'Opnieuw proberen mislukt',
  playPauseLabel_pause: 'Pauzeren',
  playPauseLabel_play: 'Afspelen',
};

const playlistResponse = {
  tracks: [
    { id: 'alpha', title: 'Alpha', artist: 'DJ A', src: 'alpha.mp3', cover: 'alpha.jpg', type: 'song' },
    { id: 'beta', title: 'Beta', artist: 'DJ B', src: 'beta.mp3', cover: 'beta.jpg', type: 'song' },
    { id: 'gamma', title: 'Gamma', artist: 'DJ C', src: 'gamma.mp3', cover: 'gamma.jpg', type: 'song' },
  ],
  config: {
    crossfadeSeconds: 0.1,
  },
};

class FakeAudio {
  constructor() {
    this.src = '';
    this.volume = 1;
    this.currentTime = 0;
    this.duration = 120;
    this.preload = 'auto';
    this.crossOrigin = 'anonymous';
    this.paused = true;
    this._listeners = {};
  }

  play() {
    this.paused = false;
    this._emit('play');
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
    this._emit('pause');
  }

  addEventListener(event, handler) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(handler);
  }

  removeEventListener(event, handler) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter((cb) => cb !== handler);
  }

  _emit(event) {
    (this._listeners[event] || []).forEach((cb) => cb({ target: this }));
  }
}

class FakeAudioContext {
  constructor() {
    this.state = 'running';
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
    this.state = 'running';
    return Promise.resolve();
  }
}

describe('manual track selection during playback', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetModules();
    vi.spyOn(Math, 'random').mockReturnValue(0);

    document.body.innerHTML = `
      <div id="track-info"></div>
      <img id="track-cover" />
      <div id="track-title"></div>
      <div id="track-artist"></div>
      <div id="progress-container"></div>
      <div id="progress-bar"></div>
      <div id="sticky-progress-bar"></div>
      <span id="current-time"></span>
      <span id="time-remaining"></span>
      <input id="volume-slider" value="1" type="range" />
      <button id="play-pause-btn"></button>
      <button id="next-btn"></button>
      <button id="like-btn"></button>
      <span id="like-count"></span>
      <div id="rating-section"></div>
      <div class="star-rating"></div>
      <form id="comment-form"><input id="comment-input" /></form>
      <div id="average-rating-display"></div>
      <div id="sticky-player">
        <img id="sticky-track-cover" />
        <div id="sticky-track-title"></div>
        <button id="sticky-play-pause-btn"></button>
        <button id="sticky-next-btn"></button>
      </div>
      <div id="side-panel"></div>
      <button id="menu-toggle"></button>
      <ul id="history-list"></ul>
      <ul id="golden-records-list"></ul>
      <ul id="top-rated-list"></ul>
      <ul id="messages-list"></ul>
      <form id="dj-message-form"><input id="dj-message-input" /></form>
      <form id="song-dedication-form"><input id="song-words-input" /><input id="song-name-input" /></form>
      <ul id="song-dedication-list"></ul>
      <div id="song-dedication-feedback"></div>
      <div id="month-year-display"></div>
      <div id="calendar-grid"></div>
      <button id="prev-month-btn"></button>
      <button id="next-month-btn"></button>
      <div id="event-modal"></div>
      <div id="modal-date-display"></div>
      <form id="modal-note-form"></form>
      <select id="modal-name-input"></select>
      <select id="modal-note-input"></select>
      <button id="modal-cancel-btn"></button>
      <div id="modal-feedback"></div>
      <div id="autoplay-overlay"></div>
      <button id="start-btn"></button>
      <div id="welcome-greeting"></div>
      <canvas id="visualizer-canvas"></canvas>
      <div id="offline-indicator"></div>
      <div id="error-overlay" class="hidden"></div>
      <div id="error-message"></div>
      <button id="error-close-btn"></button>
      <button id="error-retry-btn"></button>
      <div id="radio-view"></div>
      <div id="calendar-view"></div>
      <button id="calendar-view-btn"></button>
      <button id="radio-view-btn"></button>
      <div class="theme-switcher"><button id="theme-arburg"></button></div>
      <div id="now-playing-section"></div>
      <div id="listener-count"></div>
    `;

    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      writable: true,
      value: class {
        constructor() {}
        observe() {}
        disconnect() {}
        unobserve() {}
      },
    });

    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      writable: true,
      value: FakeAudioContext,
    });

    Object.defineProperty(global, 'Audio', {
      configurable: true,
      writable: true,
      value: FakeAudio,
    });

    Object.defineProperty(window.navigator, 'language', {
      configurable: true,
      value: 'nl-NL',
    });

    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true,
    });

    global.fetch = vi.fn(async (input) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.includes('locales')) {
        return new Response(JSON.stringify(translationsResponse), {
          headers: { 'content-type': 'application/json' },
        });
      }
      if (url.includes('playlist.json')) {
        return new Response(JSON.stringify(playlistResponse), {
          headers: { 'content-type': 'application/json' },
        });
      }
      if (url.includes('api.php')) {
        return new Response(JSON.stringify({ fallback: true }), {
          headers: { 'content-type': 'application/json' },
        });
      }
      throw new Error(`Unexpected fetch to ${url}`);
    });
    window.fetch = global.fetch;

    global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
    global.cancelAnimationFrame = (id) => clearTimeout(id);

    await import('../app.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));

    await Promise.resolve();
    await Promise.resolve();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    delete global.fetch;
    delete window.__APP_TEST_HOOKS;
  });

  it('keeps manual selection active through crossfade', async () => {
    const hooks = window.__APP_TEST_HOOKS;
    expect(hooks).toBeDefined();

    for (let i = 0; i < 20 && hooks.getState().playlist.length === 0; i++) {
      await Promise.resolve();
    }

    expect(hooks.getState().playlist.length).toBeGreaterThan(0);
    hooks.startRadio();

    await Promise.resolve();
    await Promise.resolve();

    const state = hooks.getState();
    const players = hooks.getPlayers();

    // Allow playback promise to resolve and preload next track
    await Promise.resolve();

    const initialActiveIndex = hooks.getActivePlayerIndex();
    const inactiveIndex = 1 - initialActiveIndex;

    const manualTrack = state.playlist.find((track) => track.id === 'gamma');
    const preloadedSrc = players[inactiveIndex].src;
    expect(preloadedSrc).not.toBe(manualTrack.src);
    players[initialActiveIndex].currentTime = 5;

    hooks.playTrackNow(manualTrack);

    expect(players[inactiveIndex].src).toBe('gamma.mp3');
    expect(state.isCrossfading).toBe(true);

    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(200);
    await Promise.resolve();

    const newActiveIndex = hooks.getActivePlayerIndex();
    expect(newActiveIndex).toBe(inactiveIndex);
    expect(state.currentTrack?.id).toBe('gamma');
    expect(players[newActiveIndex].src).toBe('gamma.mp3');
    expect(state.nextTrack?.id).toBe('beta');
    expect(state.isCrossfading).toBe(false);
  });
});
