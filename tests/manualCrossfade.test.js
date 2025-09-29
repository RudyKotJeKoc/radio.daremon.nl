import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

class MockAudio extends EventTarget {
  static instances = [];

  constructor() {
    super();
    this.crossOrigin = '';
    this.preload = '';
    this._src = '';
    this.volume = 1;
    this.currentTime = 0;
    this.duration = 240;
    this.paused = true;
    this._listeners = new Map();
    MockAudio.instances.push(this);
  }

  set src(value) {
    this._src = value;
  }

  get src() {
    return this._src;
  }

  play() {
    this.paused = false;
    this.dispatchEvent(new Event('play'));
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
    this.dispatchEvent(new Event('pause'));
  }
}

const createJsonResponse = (data) => ({
  ok: true,
  status: 200,
  headers: {
    get: () => 'application/json',
  },
  json: async () => data,
  text: async () => JSON.stringify(data),
});

const buildDom = () => {
  document.body.innerHTML = `
    <div id="radio-view"></div>
    <div id="calendar-view" class="hidden"></div>
    <div id="track-info"></div>
    <img id="track-cover" />
    <div id="track-title"></div>
    <div id="track-artist"></div>
    <div id="progress-container"><div id="progress-bar"></div></div>
    <div id="sticky-progress-bar"></div>
    <div id="current-time"></div>
    <div id="time-remaining"></div>
    <button id="play-pause-btn"></button>
    <button id="next-btn"></button>
    <button id="like-btn"></button>
    <span id="like-count"></span>
    <input id="volume-slider" type="range" value="1" />
    <section id="rating-section"><div class="star-rating"></div></section>
    <form id="comment-form"><input id="comment-input" /></form>
    <div id="average-rating-display"></div>
    <div id="sticky-player">
      <img id="sticky-track-cover" />
      <div id="sticky-track-title"></div>
      <button id="sticky-play-pause-btn"></button>
      <button id="sticky-next-btn"></button>
    </div>
    <aside id="side-panel">
      <button id="menu-toggle"></button>
      <ul id="history-list"></ul>
      <ul id="golden-records-list"></ul>
      <ul id="top-rated-list"></ul>
      <ul id="messages-list"></ul>
      <form id="dj-message-form"><textarea id="dj-message-input"></textarea></form>
      <form id="song-dedication-form">
        <textarea id="song-words-input"></textarea>
        <input id="song-name-input" />
      </form>
      <ul id="song-dedication-list"></ul>
      <div id="song-dedication-feedback"></div>
    </aside>
    <header><span id="listener-count"></span></header>
    <button id="calendar-view-btn"></button>
    <button id="radio-view-btn"></button>
    <div id="calendar-grid"></div>
    <div id="month-year-display"></div>
    <button id="prev-month-btn"></button>
    <button id="next-month-btn"></button>
    <div id="event-modal" class="hidden"></div>
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
    <div class="theme-switcher"></div>
  `;
};

describe('manual track selection during playback', () => {
  let fetchMock;
  let randomSpy;
  let originalLanguageDescriptor;
  let originalServiceWorkerDescriptor;
  let IntersectionObserverStub;

  beforeEach(() => {
    vi.useFakeTimers();
    MockAudio.instances = [];
    buildDom();
    localStorage.clear();

    fetchMock = vi.fn(async (url) => {
      if (url.includes('locales')) {
        return createJsonResponse({
          loading: 'Loading',
          startBtn: 'Start',
          errorPlaylistLoad: 'Error',
          errorTimeout: 'Timeout',
          retrying: 'Retrying',
          retryFailed: 'Retry failed',
          you: 'You',
          aiDjName: 'DJ Bot',
          aiResponses: ['Hi'],
          playPauseLabel_pause: 'Pause',
          playPauseLabel_play: 'Play',
          songDedicationEmpty: 'Empty',
          songDedicationThanks: 'Thanks',
          songDedicationCooldown: 'Cooldown',
          songDedicationMissing: 'Missing',
          songDedicationTime: 'Time',
        });
      }

      if (url.includes('playlist.json')) {
        return createJsonResponse({
          config: { crossfadeSeconds: 2 },
          tracks: [
            { id: 'track-1', title: 'One', artist: 'Alpha', src: 'https://example.com/1.mp3', cover: '', type: 'song' },
            { id: 'track-2', title: 'Two', artist: 'Beta', src: 'https://example.com/2.mp3', cover: '', type: 'song' },
            { id: 'track-3', title: 'Three', artist: 'Gamma', src: 'https://example.com/3.mp3', cover: '', type: 'song', golden: true },
          ],
        });
      }

      if (url.includes('api.php')) {
        return createJsonResponse({ fallback: true });
      }

      throw new Error(`Unhandled fetch for ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock;
    globalThis.fetch = fetchMock;
    global.fetch = fetchMock;
    IntersectionObserverStub = class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() { return []; }
    };
    window.IntersectionObserver = IntersectionObserverStub;
    globalThis.IntersectionObserver = IntersectionObserverStub;
    global.IntersectionObserver = IntersectionObserverStub;
    vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);
    vi.stubGlobal('Audio', MockAudio);

    randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);

    originalLanguageDescriptor = Object.getOwnPropertyDescriptor(window.navigator, 'language');
    originalServiceWorkerDescriptor = Object.getOwnPropertyDescriptor(window.navigator, 'serviceWorker');

    Object.defineProperty(window.navigator, 'language', {
      value: 'nl-NL',
      configurable: true,
    });

    Object.defineProperty(window.navigator, 'serviceWorker', {
      value: {
        register: vi.fn(async () => ({ scope: '/' })),
        addEventListener: vi.fn(),
      },
      configurable: true,
    });
  });

  afterEach(() => {
    document.head.innerHTML = '';
    vi.unstubAllGlobals();
    randomSpy.mockRestore();
    delete globalThis.fetch;
    delete global.fetch;
    delete window.fetch;
    delete globalThis.IntersectionObserver;
    delete global.IntersectionObserver;
    delete window.IntersectionObserver;

    if (originalLanguageDescriptor) {
      Object.defineProperty(window.navigator, 'language', originalLanguageDescriptor);
    }

    if (originalServiceWorkerDescriptor) {
      Object.defineProperty(window.navigator, 'serviceWorker', originalServiceWorkerDescriptor);
    } else {
      delete window.navigator.serviceWorker;
    }

    vi.useRealTimers();
  });

  it('keeps the manually selected track active after crossfade', async () => {
    const scriptPath = resolve('app.js');
    const appSource = readFileSync(scriptPath, 'utf-8');
    const instrumentedSource = appSource.replace(
      '    initialize();\n});',
      "    initialize();\n    window.__testHooks = { playTrackNow, getState: () => state, getPlayers: () => players, getActivePlayerIndex: () => activePlayerIndex, preloadNextTrack, crossfade, playNextTrack };\n});"
    );
    const scriptContent = `var fetch = window.fetch;\nvar IntersectionObserver = window.IntersectionObserver;\n${instrumentedSource}`;
    window.eval(scriptContent);
    window.fetch = fetchMock;
    window.eval('fetch = window.fetch;');
    window.IntersectionObserver = IntersectionObserverStub;
    window.eval('IntersectionObserver = window.IntersectionObserver;');

    expect(typeof fetch).toBe('function');
    expect(typeof window.fetch).toBe('function');

    document.dispatchEvent(new Event('DOMContentLoaded'));
    await flushPromises();

    const startBtn = document.getElementById('start-btn');
    startBtn.click();
    await flushPromises();

    const players = MockAudio.instances;
    expect(players[0]).toBeDefined();
    expect(players[1]).toBeDefined();

    const hooks = window.__testHooks;
    const activeIndex = hooks.getActivePlayerIndex();
    players[activeIndex].currentTime = 5;

    const trackToPlay = hooks.getState().playlist.find(track => track.id === 'track-3');
    expect(trackToPlay).toBeDefined();

    hooks.playTrackNow(trackToPlay);

    await vi.advanceTimersByTimeAsync(2200);
    await flushPromises();

    const playingPlayer = MockAudio.instances.find(player => !player.paused);
    expect(playingPlayer?.src).toBe('https://example.com/3.mp3');
  });
});
