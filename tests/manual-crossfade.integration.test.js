import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<body>
    <section id="radio-view"></section>
    <section id="calendar-view" class="hidden"></section>
    <div id="track-info"></div>
    <img id="track-cover" alt="">
    <div id="track-title"></div>
    <div id="track-artist"></div>
    <div id="progress-container"><div id="progress-bar"></div></div>
    <div id="sticky-progress-bar"></div>
    <div id="current-time"></div>
    <div id="time-remaining"></div>
    <button id="play-pause-btn" type="button"></button>
    <button id="next-btn" type="button"></button>
    <button id="like-btn" type="button"></button>
    <span id="like-count"></span>
    <input id="volume-slider" type="range" value="0.5" min="0" max="1" step="0.01" />
    <div id="rating-section"></div>
    <div class="star-rating"></div>
    <form id="comment-form"><input id="comment-input" /></form>
    <div id="average-rating-display"></div>
    <div id="sticky-player">
        <img id="sticky-track-cover" alt="">
        <div id="sticky-track-title"></div>
        <button id="sticky-play-pause-btn" type="button"></button>
        <button id="sticky-next-btn" type="button"></button>
    </div>
    <aside id="side-panel">
        <button id="menu-toggle" type="button"></button>
        <ul id="history-list"></ul>
        <ul id="golden-records-list"></ul>
        <ul id="top-rated-list"></ul>
        <ul id="messages-list"></ul>
        <form id="dj-message-form"><input id="dj-message-input" /></form>
        <form id="song-dedication-form">
            <input id="song-words-input" />
            <input id="song-name-input" />
        </form>
        <ul id="song-dedication-list"></ul>
        <div id="song-dedication-feedback"></div>
    </aside>
    <div id="listener-count"></div>
    <div id="autoplay-overlay"></div>
    <button id="start-btn" type="button"></button>
    <div id="welcome-greeting"></div>
    <canvas id="visualizer-canvas"></canvas>
    <div id="offline-indicator"></div>
    <div id="error-overlay" class="hidden"></div>
    <div id="error-message"></div>
    <button id="error-close-btn" type="button"></button>
    <button id="error-retry-btn" type="button"></button>
    <div class="theme-switcher"></div>
    <button id="calendar-view-btn" type="button"></button>
    <button id="radio-view-btn" type="button"></button>
    <div id="calendar-grid"></div>
    <div id="month-year-display"></div>
    <button id="prev-month-btn" type="button"></button>
    <button id="next-month-btn" type="button"></button>
    <div id="event-modal"></div>
    <div id="modal-date-display"></div>
    <form id="modal-note-form">
        <select id="modal-name-input"></select>
        <select id="modal-note-input"></select>
        <button id="modal-cancel-btn" type="button"></button>
    </form>
    <div id="modal-feedback"></div>
    <section id="now-playing-section"></section>
</body>
</html>`;

describe('manual track selection crossfade', () => {
    let dom;
    let api;

    beforeEach(async () => {
        vi.restoreAllMocks();
        vi.resetModules();

        dom = new JSDOM(htmlTemplate, { url: 'http://localhost' });

        global.window = dom.window;
        global.document = dom.window.document;
        global.HTMLElement = dom.window.HTMLElement;
        global.CustomEvent = dom.window.CustomEvent;
        global.Event = dom.window.Event;
        global.Node = dom.window.Node;
        global.navigator = { language: 'en-US', onLine: true };
        global.IntersectionObserver = class {
            constructor() {}
            observe() {}
            unobserve() {}
            disconnect() {}
        };
        global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
        global.cancelAnimationFrame = (id) => clearTimeout(id);

        const storage = new Map();
        global.localStorage = {
            getItem: (key) => (storage.has(key) ? storage.get(key) : null),
            setItem: (key, value) => storage.set(key, value),
            removeItem: (key) => storage.delete(key),
            clear: () => storage.clear()
        };

        class MockAudio {
            constructor() {
                this.src = '';
                this.volume = 1;
                this.paused = true;
                this.currentTime = 0;
                this.duration = 120;
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

            addEventListener(event, handler) {
                if (!this._listeners[event]) this._listeners[event] = [];
                this._listeners[event].push(handler);
            }

            removeEventListener(event, handler) {
                if (!this._listeners[event]) return;
                this._listeners[event] = this._listeners[event].filter((fn) => fn !== handler);
            }

            dispatchEvent(event) {
                const handlers = this._listeners[event.type] || [];
                handlers.forEach((handler) => handler.call(this, event));
            }
        }

        vi.stubGlobal('Audio', MockAudio);

        const jsonResponse = (data) => ({
            ok: true,
            status: 200,
            statusText: 'OK',
            headers: { get: (key) => (key.toLowerCase() === 'content-type' ? 'application/json' : null) },
            json: () => Promise.resolve(data)
        });

        const fetchMock = vi.fn((input) => {
            const url = typeof input === 'string' ? input : input.url;
            if (url.includes('playlist.json')) {
                return Promise.resolve(jsonResponse({
                    tracks: [
                        { id: 'current', src: 'current.mp3', title: 'Current', artist: 'Artist', type: 'song' },
                        { id: 'auto', src: 'auto.mp3', title: 'Auto', artist: 'Artist', type: 'song' },
                        { id: 'manual', src: 'manual.mp3', title: 'Manual', artist: 'Artist', type: 'song' }
                    ],
                    config: { crossfadeSeconds: 1 }
                }));
            }
            if (url.includes('api.php')) {
                return Promise.resolve(jsonResponse({ fallback: true }));
            }
            return Promise.resolve({ ok: false, status: 404, statusText: 'Not Found' });
        });

        vi.stubGlobal('fetch', fetchMock);

        dom.window.HTMLCanvasElement.prototype.getContext = vi.fn(() => null);

        await import('../app.js');
        dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));

        // Allow asynchronous initialization steps to complete
        await Promise.resolve();
        await Promise.resolve();

        api = dom.window.__appTestAPI;
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
        if (dom) {
            dom.window.close();
        }
        delete global.window;
        delete global.document;
        delete global.HTMLElement;
        delete global.CustomEvent;
        delete global.Event;
        delete global.Node;
        delete global.navigator;
        delete global.localStorage;
        delete global.requestAnimationFrame;
        delete global.cancelAnimationFrame;
    });

    it('keeps manually selected track through crossfade', async () => {
        vi.useFakeTimers();

        const { playTrackNow, preloadNextTrack, getState, getPlayers, getActivePlayerIndex } = api;
        const state = getState();
        const players = getPlayers();

        const currentTrack = state.playlist.find((track) => track.id === 'current');
        const autoTrack = state.playlist.find((track) => track.id === 'auto');
        const manualTrack = state.playlist.find((track) => track.id === 'manual');

        state.currentTrack = currentTrack;
        state.isPlaying = true;
        state.config.crossfadeSeconds = 1;

        const activeIndex = getActivePlayerIndex();
        const inactiveIndex = 1 - activeIndex;
        const activePlayer = players[activeIndex];
        const inactivePlayer = players[inactiveIndex];

        activePlayer.src = currentTrack.src;
        activePlayer.currentTime = 30;
        activePlayer.duration = 120;
        activePlayer.paused = false;
        activePlayer.volume = 0.5;

        state.nextTrack = autoTrack;
        inactivePlayer.src = autoTrack.src;

        playTrackNow(manualTrack);

        expect(inactivePlayer.src).toBe(manualTrack.src);

        // Attempt to preload during crossfade; should be ignored while locked
        preloadNextTrack();
        expect(state.isNextTrackLocked).toBe(true);

        await Promise.resolve();
        await vi.advanceTimersByTimeAsync(1000);

        const newActiveIndex = getActivePlayerIndex();
        const newActivePlayer = players[newActiveIndex];

        expect(state.currentTrack.id).toBe('manual');
        expect(newActivePlayer.src).toBe(manualTrack.src);
        expect(state.isNextTrackLocked).toBe(false);
    });
});
