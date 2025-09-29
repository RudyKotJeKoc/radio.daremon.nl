const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const test = require('node:test');

const appJsPath = path.resolve(__dirname, '../app.js');
const appJsSource = readFileSync(appJsPath, 'utf8');

function createDom() {
    const html = `<!DOCTYPE html>
    <html lang="en">
        <body>
            <div id="side-panel"></div>
            <ul id="messages-list" role="list"></ul>
            <ul id="song-dedication-list" role="list"></ul>
        </body>
    </html>`;

    const dom = new JSDOM(html, {
        url: 'http://localhost',
        runScripts: 'dangerously',
        pretendToBeVisual: true
    });

    class StubAudio {
        constructor() {
            this.crossOrigin = '';
            this.preload = '';
            this.volume = 1;
            this.currentTime = 0;
            this.duration = 0;
            this.src = '';
        }

        addEventListener() {}
        removeEventListener() {}
        play() { return Promise.resolve(); }
        pause() {}
        load() {}
    }

    dom.window.Audio = StubAudio;
    dom.window.__SKIP_APP_INITIALIZE__ = true;
    dom.window.fetch = async () => ({ ok: false, json: async () => ({ success: false }) });

    dom.window.eval(appJsSource);
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));

    const hooks = dom.window.__radioAppTestHooks;
    assert.ok(hooks, 'Expected test hooks to be available');

    return { dom, hooks };
}

test('renderMessages escapes script injections', () => {
    const { hooks } = createDom();
    hooks.setMessages([
        { author: 'User', text: '<script>alert(1)</script>', timestamp: '12:00', isAI: false }
    ]);

    hooks.renderMessages();
    const list = hooks.getMessagesList();
    assert.ok(list, 'Messages list element missing');
    const items = list.querySelectorAll('li');
    assert.equal(items.length, 1);
    const item = items[0];
    assert.strictEqual(item.querySelector('script'), null);
    assert.match(item.textContent, /<script>alert\(1\)<\/script>/);
});

test('renderSongDedications escapes potentially dangerous HTML', () => {
    const { hooks } = createDom();
    hooks.setSongDedications([
        { name: '<script>evil()</script>', words: '<img src=x onerror=alert(2)>', timestamp: '2024-01-01 10:00' }
    ]);

    hooks.renderSongDedications();
    const list = hooks.getSongDedicationList();
    assert.ok(list, 'Song dedication list element missing');
    const items = list.querySelectorAll('li');
    assert.equal(items.length, 1);
    const item = items[0];
    assert.strictEqual(item.querySelector('script'), null);
    assert.strictEqual(item.querySelector('img'), null);
    assert.match(item.textContent, /<script>evil\(\)<\/script>/);
    assert.match(item.textContent, /<img src=x onerror=alert\(2\)>/);
});
