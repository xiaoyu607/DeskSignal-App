// Integration test with real Chromium codecs and the production custom-file protocol.
// Authored, disposable fixtures only; no capture of the user's desktop or media.
// Run: npm run test:media (requires ffmpeg for fixture generation).
import { app, BrowserWindow, ipcMain, protocol } from 'electron';
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = mkdtempSync(join(tmpdir(), 'desksignal-media-'));
const root = resolve('.');
const fail = (condition, message) => { if (!condition) throw new Error(message); };
const ff = (args, name) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args, join(dir, name)]);
const result = { tests: [], errors: [] };
let win;
protocol.registerSchemesAsPrivileged([{scheme:'lolping', privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true,corsEnabled:true}}]);
async function runTest() {
try {
  // esbuild keeps Electron external so this test uses the same protocol implementation as production.
  await build({ stdin: { contents: "export * from './src/main/emoteLibrary'; export * from './src/main/appProtocol'; export { normalizeSettings, overlaySettings } from './src/shared/settings';", resolveDir: root },
    bundle: true, platform: 'node', format: 'esm', external: ['electron'], outfile: join(dir, 'main.mjs') });
  const { EmoteLibrary, registerAppScheme, serveAppScheme, resolveEmoteArt, normalizeSettings, overlaySettings } = await import(pathToFileURL(join(dir, 'main.mjs')).href);
  console.log('[media] protocol registered');
  app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
  app.disableHardwareAcceleration();
  app.on('window-all-closed', () => {});
  const tone = ['-f', 'lavfi', '-i', 'sine=frequency=660:duration=2'];
  ff(['-f', 'lavfi', '-i', 'testsrc2=size=128x128:rate=10:duration=2', '-loop', '0'], 'motion.gif');
  for (const ext of ['wav', 'mp3', 'ogg', 'm4a']) ff(tone, `tone.${ext}`);
  ff(['-f', 'lavfi', '-i', 'sine=duration=11'], 'long.wav');
  for (const ext of ['mp4', 'webm']) ff(['-f', 'lavfi', '-i', 'testsrc2=size=128x128:rate=10:duration=2', ...tone,
    '-c:v', ext === 'mp4' ? 'libx264' : 'libvpx-vp9', '-c:a', ext === 'mp4' ? 'aac' : 'libopus', '-shortest'], `clip.${ext}`);
  ff(['-f', 'lavfi', '-i', 'color=c=green:s=128x128:r=10:d=11', '-c:v', 'libx264'], 'long.mp4');
  writeFileSync(join(dir, 'fake.mp4'), 'not a video');
  await build({ stdin: { contents: `import { prepareEmote } from './src/renderer/settings/emoteImport'; import { EmoteStage } from './src/renderer/overlay/emoteFx'; import { Wheel } from './src/renderer/overlay/wheel';
    const stage=new EmoteStage(document.getElementById('layer'));
    const wheel=new Wheel(document.getElementById('emoteWheel'),'EMOTE','',()=>{});
    window.testMedia={prepareEmote,stage,sendCentre:(saved,volume)=>{
      wheel.setCenter({key:saved.entry.id,icon:'lolping://emotes/'+saved.entry.id.slice(2)+'.webp'});
      wheel.open(320,240);const chosen=wheel.release(320,240);
      if(chosen?.key!==saved.entry.id||wheel.release(320,240)!==null)throw Error('centre selection/duplicate');
      stage.spawn('test',saved.art,chosen.x,chosen.y,{sizePx:150,volume});
    }};`, resolveDir: root },
    bundle: true, platform: 'browser', outfile: join(dir, 'renderer.js') });
  writeFileSync(join(dir, 'preload.cjs'), "const { contextBridge, ipcRenderer }=require('electron'); contextBridge.exposeInMainWorld('mediaBridge',{save:f=>ipcRenderer.invoke('test:save',f)});");
  writeFileSync(join(dir, 'index.html'), `<html><head><meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: lolping://emotes; media-src 'self' blob: lolping://emotes; connect-src 'self' lolping://emotes"><style>${readFileSync('src/renderer/overlay/overlay.css','utf8')}</style></head><body><svg id="emoteWheel"></svg><div id="layer"></div><script src="renderer.js"></script></body></html>`);
  console.log('[media] fixtures ready'); await app.whenReady(); console.log('[media] Electron ready');
  const library = new EmoteLibrary(join(dir, 'library'));
  let entries = [];
  ipcMain.handle('test:save', async (_e, file) => {
    const saved = await library.save(file, entries);
    fail(saved.ok, `save failed ${JSON.stringify(saved)}`);
    entries.push(saved.emote);
    entries = normalizeSettings({ customEmotes: entries }).customEmotes;
    return { entry: entries.at(-1), art: resolveEmoteArt(saved.emote.id, entries, false) };
  });
  serveAppScheme({ rendererRoot: dir, emoteDirs: () => [library.dir] });
  win = new BrowserWindow({ show: false, width: 640, height: 480, webPreferences: { preload: join(dir, 'preload.cjs'), backgroundThrottling: false } });
  win.webContents.on('console-message', (e) => { if (e.level === 'error') result.errors.push(e.message); });
  await win.loadURL('lolping://app/index.html'); console.log('[media] renderer loaded');
  const run = (code) => win.webContents.executeJavaScript(`(async()=>{${code}})()`);
  const load = `const pick=async n=>new File([await (await fetch('lolping://app/'+n)).blob()], n);`;
  for (const ext of ['wav', 'mp3', 'ogg', 'm4a']) { console.log('[media] audio',ext);
    const data = await run(`${load} const prepared=await testMedia.prepareEmote(await pick('motion.gif'),await pick('tone.${ext}'));
      if(!prepared.ok)throw new Error(JSON.stringify(prepared)); const saved=await mediaBridge.save(prepared.file);
      testMedia.sendCentre(saved,.4);
      const a=document.querySelector('audio'); await new Promise((ok,no)=>{a.addEventListener('playing',ok,{once:true});setTimeout(()=>no(Error('audio timeout')),3000)});
      const deadline=Date.now()+3000; while(a.currentTime<.05&&Date.now()<deadline)await new Promise(r=>setTimeout(r,50)); const info={...saved.entry,time:a.currentTime,volume:a.volume,muted:a.muted,decoded:document.querySelector('img').naturalWidth};
      testMedia.stage.setVolume(0); info.silenced=a.muted; testMedia.stage.clear('test');info.stopped=a.paused;return info;`);
    fail(data.time > 0 && data.volume === .4 && !data.muted && data.silenced && data.stopped && data.decoded > 0, `audio ${ext}: ${JSON.stringify(data)}`);
    result.tests.push({ case: `GIF + ${ext}: decode, save, play, mute, stop`, ...data });
  }
  for (const ext of ['mp4', 'webm']) {
    const data = await run(`${load} const prepared=await testMedia.prepareEmote(await pick('clip.${ext}'));if(!prepared.ok)throw new Error(JSON.stringify(prepared));
      const saved=await mediaBridge.save(prepared.file); testMedia.sendCentre(saved,.4);
      const v=document.querySelector('video');await new Promise((ok,no)=>{v.addEventListener('playing',ok,{once:true});setTimeout(()=>no(Error('video timeout')),3000)});
      const deadline=Date.now()+3000; while(v.currentTime<.05&&Date.now()<deadline)await new Promise(r=>setTimeout(r,50));const info={...saved.entry,time:v.currentTime,width:v.videoWidth,volume:v.volume,muted:v.muted};
      testMedia.sendCentre(saved,0);const next=document.querySelector('video');info.replaced=v.paused&&next!==v;info.nextMuted=next.muted;testMedia.stage.clear('test');return info;`);
    fail(data.time > 0 && data.width === 128 && data.replaced && data.nextMuted && !data.muted, `video ${ext}: ${JSON.stringify(data)}`);
    result.tests.push({ case: `${ext}: decode, save, embedded audio, replace, mute`, ...data });
  }
  const invalid = await run(`${load} return [await testMedia.prepareEmote(await pick('long.mp4')),await testMedia.prepareEmote(await pick('motion.gif'),await pick('long.wav')),await testMedia.prepareEmote(await pick('fake.mp4'))];`);
  fail(invalid[0].error === 'duration' && invalid[1].error === 'duration' && invalid[2].error === 'type', JSON.stringify(invalid));
  result.tests.push({ case: 'Reject 11-second video/audio and a forged MP4', results: invalid });
  // Exercise the complete built overlay and production preload, not just Wheel in isolation.
  win.destroy(); win = undefined;
  protocol.unhandle('lolping');
  serveAppScheme({ rendererRoot: resolve('out/renderer'), emoteDirs: () => [library.dir] });
  win = new BrowserWindow({ show: false, width: 1000, height: 700, webPreferences: { preload: resolve('out/preload/overlay.js'), backgroundThrottling: false } });
  win.webContents.on('console-message', (e) => { if (e.level === 'error') result.errors.push(e.message); });
  const reported = [];
  ipcMain.on('overlay:pinged', (_e, payload) => reported.push({ wheel: 'ping', ...payload }));
  ipcMain.on('overlay:emoted', (_e, payload) => reported.push({ wheel: 'emote', ...payload }));
  await win.loadURL('lolping://app/overlay/index.html');
  const settings = normalizeSettings({ customEmotes: entries, clickPingId: 'generic', clickEmoteId: 'facepalm' });
  win.webContents.send('overlay:settings', overlaySettings(settings));
  for (const wheel of ['ping', 'emote']) for (const centre of [true, false]) {
    const before = reported.length;
    win.webContents.send('wheel:open', { x: 500, y: 350, wheel });
    if (!centre) win.webContents.send('wheel:move', { x: 640, y: 350, wheel });
    win.webContents.send('wheel:release', { x: centre ? 500 : 640, y: 350, wheel });
    win.webContents.send('wheel:release', { x: centre ? 500 : 640, y: 350, wheel });
    await new Promise(r => setTimeout(r, 250));
    const emitted = reported.slice(before);
    const expected = centre ? wheel === 'ping' ? 'generic' : 'facepalm' : wheel === 'ping' ? settings.wheel[2] : settings.emoteWheel[2];
    fail(emitted.length === 1 && (emitted[0].id ?? emitted[0].ref) === expected, `production ${wheel} ${centre ? 'centre' : 'slice'}: ${JSON.stringify(emitted)}`);
    result.tests.push({ case: `Full production ${wheel} ${centre ? 'centre' : 'slice'} sends exactly once`, emitted });
  }
  for (const e of entries) await library.remove(e.id);
  fail(!result.errors.length, result.errors.join('\n'));
  console.log(JSON.stringify(result,null,2));
  if (process.env.DESKSIGNAL_MEDIA_REPORT) writeFileSync(process.env.DESKSIGNAL_MEDIA_REPORT, JSON.stringify(result,null,2));
  win.destroy(); win = undefined; rmSync(dir,{recursive:true,force:true}); app.exit(0);
} catch (error) {
  console.error(error, result.errors); if(win)console.error(await win.webContents.executeJavaScript('document.body.innerHTML.slice(0,1200)')); win?.destroy(); rmSync(dir,{recursive:true,force:true}); app.exit(1);
}

}
void runTest();
