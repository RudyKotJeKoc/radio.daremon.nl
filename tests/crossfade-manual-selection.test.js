const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

class MockAudio {
    constructor() {
        this.src = '';
        this.crossOrigin = '';
        this.preload = '';
        this.volume = 1;
        this.currentTime = 0;
        this.duration = 120;
        this.paused = true;
        this.eventListeners = {};
    }

    play() {
        this.paused = false;
        return Promise.resolve();
    }

    pause() {
        this.paused = true;
    }

    addEventListener(event, handler) {
        this.eventListeners[event] = handler;
    }

    removeEventListener(event) {
        delete this.eventListeners[event];
    }
}

class MockAudioContext {
    constructor() {
        this.destination = {};
    }

    createAnalyser() {
        return {
            fftSize: 0,
            frequencyBinCount: 32,
            getByteFrequencyData: () => {},
            connect: () => {}
        };
    }

    createMediaElementSource() {
        return {
            connect: () => {}
        };
    }

    createGain() {
        return {
            connect: () => {}
        };
    }

    connect() {}
}

class MockIntersectionObserver {
    constructor(callback) {
        this.callback = callback;
    }

    observe() {}

    disconnect() {}
}

const html = `
<!DOCTYPE html>
<html lang="en">
<head><title>Test</title></head>
<body>
    <div id="track-cover"></div>
    <div id="track-title"></div>
    <div id="track-artist"></div>
    <div id="track-info"></div>
    <div id="progress-container"></div>
    <div id="progress-bar"></div>
    <div id="sticky-progress-bar"></div>
    <span id="current-time"></span>
    <span id="time-remaining"></span>
    <button id="play-pause-btn"></button>
    <button id="next-btn"></button>
    <button id="like-btn"></button>
    <span id="like-count"></span>
    <input id="volume-slider" value="0.5" />
    <div class="star-rating"></div>
    <form id="comment-form"></form>
    <div id="average-rating-display"></div>
    <div id="sticky-player">
        <img id="sticky-track-cover" />
        <span id="sticky-track-title"></span>
        <button id="sticky-play-pause-btn"></button>
        <button id="sticky-next-btn"></button>
    </div>
    <div id="side-panel"></div>
    <button id="menu-toggle"></button>
    <ul id="history-list"></ul>
    <ul id="golden-records-list"></ul>
    <ul id="top-rated-list"></ul>
    <ul id="messages-list"></ul>
    <form id="dj-message-form"></form>
    <input id="dj-message-input" />
    <form id="song-dedication-form"></form>
    <textarea id="song-words-input"></textarea>
    <input id="song-name-input" />
    <ul id="song-dedication-list"></ul>
    <div id="song-dedication-feedback"></div>
    <span id="listener-count"></span>
    <div id="radio-view"></div>
    <div id="calendar-view"></div>
    <button id="calendar-view-btn"></button>
    <button id="radio-view-btn"></button>
    <div id="month-year-display"></div>
    <div id="calendar-grid"></div>
    <button id="prev-month-btn"></button>
    <button id="next-month-btn"></button>
    <div id="event-modal"></div>
    <span id="modal-date-display"></span>
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
    <div id="error-overlay"></div>
    <div id="error-message"></div>
    <button id="error-close-btn"></button>
    <button id="error-retry-btn"></button>
    <div class="theme-switcher"></div>
    <section id="now-playing-section"></section>
</body>
</html>
`;

const dom = new JSDOM(html, { url: 'http://localhost' });

const { window } = dom;
const { document } = window;

global.window = window;
global.document = document;
global.navigator = {
    language: 'nl-NL',
    onLine: true,
    serviceWorker: {
        register: () => Promise.resolve({ scope: 'test' }),
        addEventListener: () => {}
    }
};

global.localStorage = (() => {
    const store = new Map();
    return {
        getItem: (key) => (store.has(key) ? store.get(key) : null),
        setItem: (key, value) => store.set(key, value),
        removeItem: (key) => store.delete(key),
        clear: () => store.clear()
    };
})();

const translations = {
    loading: 'Loading...',
    startBtn: 'Start',
    errorPlaylistLoad: 'Error',
    errorTimeout: 'Timeout',
    errorFetch: 'Fetch',
    retrying: 'Retrying',
    retryFailed: 'Retry failed',
    you: 'You',
    aiDjName: 'AI DJ',
    aiResponses: ['Ok'],
    trackTitleDefault: 'Default',
    trackArtistDefault: 'Default',
    headerSubtitle: 'Subtitle',
    listenersLabel: 'Listeners',
    goldenRecords: 'Golden Records',
    topRated: 'Top Rated',
    recentlyPlayed: 'Recently Played',
    djMessages: 'DJ Messages',
    themes: 'Themes',
    tools: 'Tools',
    evacuationCalendar: 'Calendar',
    backToRadio: 'Back',
    sendBtn: 'Send',
    submitReview: 'Submit',
    hotkeysInfo: 'Info',
    songDedicationTitle: 'Title',
    songDedicationIntro: 'Intro',
    songWordsLabel: 'Words',
    songWordsPlaceholder: 'Words placeholder',
    songNameLabel: 'Name',
    songNamePlaceholder: 'Name placeholder',
    songDedicationSubmit: 'Submit',
    songDedicationThanks: 'Thanks',
    songDedicationCooldown: 'Cooldown',
    songDedicationMissing: 'Missing',
    songDedicationEmpty: 'Empty',
    songDedicationTime: 'Time',
    playPauseLabel_pause: 'Pause',
    playPauseLabel_play: 'Play'
};

const playlistResponse = {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: { get: () => 'application/json' },
    json: async () => ({
        tracks: [
            { id: 'track-1', src: 'track-1.mp3', title: 'Track 1', artist: 'Artist 1', cover: 'cover1.jpg', type: 'song' },
            { id: 'track-2', src: 'track-2.mp3', title: 'Track 2', artist: 'Artist 2', cover: 'cover2.jpg', type: 'song' },
            { id: 'track-3', src: 'track-3.mp3', title: 'Track 3', artist: 'Artist 3', cover: 'cover3.jpg', type: 'song' }
        ],
        config: { crossfadeSeconds: 0.2 }
    })
};

const localeResponse = {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: { get: () => 'application/json' },
    json: async () => translations
};

global.fetch = (url) => {
    if (url.includes('playlist.json')) {
        return Promise.resolve(playlistResponse);
    }
    if (url.includes('locales/')) {
        return Promise.resolve(localeResponse);
    }
    if (url.includes('api.php')) {
        return Promise.resolve({
            ok: true,
            json: async () => ({ fallback: true })
        });
    }
    return Promise.resolve({
        ok: true,
        json: async () => ({})
    });
};

global.Audio = MockAudio;
window.AudioContext = MockAudioContext;
window.webkitAudioContext = MockAudioContext;
window.IntersectionObserver = MockIntersectionObserver;
global.IntersectionObserver = MockIntersectionObserver;
window.requestAnimationFrame = (cb) => setTimeout(cb, 0);
window.cancelAnimationFrame = (id) => clearTimeout(id);
global.requestAnimationFrame = window.requestAnimationFrame;
global.cancelAnimationFrame = window.cancelAnimationFrame;

const canvas = document.getElementById('visualizer-canvas');
canvas.getContext = () => ({
    clearRect: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    fillRect: () => {}
});

document.body.dataset = {};

const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf-8');
window.eval(appJs);

document.dispatchEvent(new window.Event('DOMContentLoaded'));

function waitFor(condition, timeout = 2000) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        function check() {
            if (condition()) {
                resolve();
            } else if (Date.now() - start >= timeout) {
                reject(new Error('Timed out waiting for condition'));
            } else {
                setTimeout(check, 10);
            }
        }
        check();
    });
}

(async () => {
    await waitFor(() => window.__radioAppTestAPI__ && window.__radioAppTestAPI__.state.playlist.length > 0);

    const api = window.__radioAppTestAPI__;

    api.startRadio();

    await new Promise(resolve => setTimeout(resolve, 50));

    const firstPlayer = api.players[api.activePlayerIndex];
    firstPlayer.currentTime = 5;

    const manualTrack = api.state.playlist.find(track => track.id === 'track-2');
    api.playTrackNow(manualTrack);

    await new Promise(resolve => setTimeout(resolve, 400));

    const activePlayer = api.players[api.activePlayerIndex];

    assert.strictEqual(api.state.currentTrack.id, manualTrack.id, 'Manual track should become current after crossfade');
    assert.strictEqual(activePlayer.src, manualTrack.src, 'Active player should play the manually selected track');

    console.log('Manual selection crossfade regression test passed');
    process.exit(0);
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
