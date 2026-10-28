// Dependency-free integration checks using mocked Drive responses and media/DOM.
const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
class Element {
  constructor() { this.value = ''; this.children = []; this.attrs = {}; this.events = {}; this.classList = { add(){}, remove(){}, toggle(){} }; this.paused = true; this.currentTime = 0; this.duration = NaN; }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; }
  setAttribute(k,v) { this.attrs[k] = v; }
  getAttribute(k) { return this.attrs[k] || null; }
  removeAttribute(k) { delete this.attrs[k]; }
  addEventListener(k,fn) { this.events[k] = fn; }
  pause() { this.paused = true; }
  load() {}
  async play() { this.paused = false; this.events.playing?.(); }
  set src(v) { this.attrs.src = v; }
  get src() { return this.attrs.src; }
}
const nodes = new Map();
const get = id => { if (!nodes.has(id)) nodes.set(id,new Element()); return nodes.get(id); };
get('sort').value = 'asc';
const calls = [], responses = [];
const ctx = vm.createContext({ console, URL, AbortSignal: { timeout: () => undefined }, document: { getElementById:get, createElement:() => new Element() }, fetch:async (url,options) => { calls.push({url:new URL(url),options}); assert(responses.length,'Unexpected request'); return responses.shift(); } });
const run = code => vm.runInContext(code,ctx);
const response = (body,status = 200) => ({ok:status < 400,status,json:async () => body});
const script = fs.readFileSync('index.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
vm.runInContext(script,ctx);
assert.match(get('library-status').textContent,/Setup needed/);
assert.equal(calls.length,0,'Unconfigured app makes no API calls');
// Replace only the in-memory config for the configured integration scenario.
const configured = vm.createContext({ console, URL, AbortSignal: { timeout: () => undefined }, document: { getElementById:get, createElement:() => new Element() }, fetch:ctx.fetch });
const evaluate = code => vm.runInContext(code,configured);
const song = {id:'song1',name:'01 Calm.mp3',mimeType:'audio/mpeg',size:'1024'};
responses.push(response({id:'public-folder',name:'Test collection',mimeType:'application/vnd.google-apps.folder'}),response({nextPageToken:'page-two',files:[song,{id:'doc',name:'notes.pdf',mimeType:'application/pdf'}]}));
vm.runInContext(script.replace('PASTE_YOUR_GOOGLE_API_KEY_HERE','test-key').replace('PASTE_YOUR_PUBLIC_FOLDER_ID_HERE','public-folder'),configured);
const settle = () => new Promise(resolve => setImmediate(resolve));
(async () => {
  await settle();
  assert.equal(evaluate('state.files.length'),1);
  assert.equal(calls[1].url.searchParams.get('q'),"'public-folder' in parents and trashed = false");
  assert.equal(calls[1].options.credentials,'omit');
  responses.push(response({files:[{id:'song2',name:'Ambient.WAV',mimeType:'application/octet-stream'},song]}));
  await evaluate('loadLibrary()');
  assert.equal(calls[2].url.searchParams.get('pageToken'),'page-two');
  assert.equal(evaluate('state.files.length'),2,'Pagination deduplicates and extension fallback works');
  assert.equal(evaluate('state.token'),'');
  get('search').value = 'calm'; assert.equal(evaluate('visibleFiles().length'),1); get('search').value = '';
  responses.push(response({parents:['public-folder'],capabilities:{canDownload:true}}));
  await evaluate('state.queue = [...state.files]; select(0)');
  assert.equal(new URL(get('audio').src).searchParams.get('alt'),'media');
  assert.equal(new URL(get('audio').src).searchParams.get('key'),'test-key');
  assert.match(get('player-status').textContent,/Playing/);
  responses.push(response({parents:['some-other-folder']}));
  await evaluate('select(1)');
  assert.match(get('player-status').textContent,/removed from the configured folder/);
  assert.equal(evaluate('state.failed'),true);
  responses.push(response({error:{message:'Download quota exceeded'}},403));
  evaluate('state.failed = false'); await evaluate('playbackFailure()');
  assert.match(get('player-status').textContent,/quota/);
  assert.equal(calls.at(-1).options.headers.Range,'bytes=0-0');
  for (const [code,body,expected] of [[404,{},/not found/],[403,{},/Access denied/],[400,{},/Invalid Drive/],[403,{error:{message:'API key invalid'}},/API key rejected/],[429,{},/quota/]]) {
    configured.input = body; assert.match(evaluate(`apiError(${code}, input)`),expected);
  }
  assert.equal(evaluate("isAudio({name:'fake.mp3',mimeType:'application/vnd.google-apps.shortcut'})"),false);
  assert.equal(evaluate('time(125)'), '2:05');
  console.log('PASS: configuration, folder scope, pagination, audio filtering, search, playback endpoint, membership checks, and actionable errors.');
})().catch(error => { console.error(error); process.exitCode = 1; });
