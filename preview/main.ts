import type { AppStatus, SettingsApi } from '../src/shared/ipc';
import type { Settings } from '../src/shared/settings';
import { DEFAULT_SETTINGS, normalizeSettings } from '../src/shared/settings';
import { strings } from '../src/shared/i18n';

let settings:Settings=structuredClone({...DEFAULT_SETTINGS,language:'zh-CN',displayName:'xiaoyu607'});
let status:AppStatus={enabled:true,helper:'running'};
const settingsListeners=new Set<(s:Settings)=>void>(), statusListeners=new Set<(s:AppStatus)=>void>();
const noop=async()=>{};
const subscribe=<T>(listeners:Set<(s:T)=>void>,cb:(s:T)=>void)=>{listeners.add(cb);return()=>{listeners.delete(cb);};};
window.settingsApi = {
  platform:'mac',
  getSettings:async()=>settings,
  setSettings:async(patch)=>{settings=normalizeSettings({...settings,...patch},'mac');settingsListeners.forEach(cb=>cb(settings));return{ok:true,settings};},
  onSettings:cb=>subscribe(settingsListeners,cb),
  getStatus:async()=>status, onStatus:cb=>subscribe(statusListeners,cb),
  setEnabled:async(on)=>{status={...status,enabled:on};statusListeners.forEach(cb=>cb(status));},
  previewPing:noop,previewEmote:noop,importEmote:async()=>({ok:false,error:'disk'}),removeEmote:noop,
  getAbout:async()=>({version:'0.5.5',problems:[],limitations:strings('zh-CN','mac').limitations}),
  openSettingsFolder:noop,openProjectPage:async()=>{window.open('https://github.com/xiaoyu607/DeskSignal-App','_blank','noopener');},
  retryHelper:noop,setCapturing:noop,openAccessibility:noop,
  getRoom:async()=>({phase:'idle',code:null,members:[],lan:'off',internet:'off',lonely:false,clockSkew:false,displays:[{number:1,width:1600,height:900,primary:true}]}),
  onRoom:()=>()=>{},createRoom:noop,joinRoom:async()=>({ok:false,error:'failed'}),leaveRoom:noop,muteMember:noop,clipboardRoomCode:async()=>null,copyRoomCode:noop,retryInternet:noop,onShowSection:()=>()=>{},
  getUpdate:async()=>null,onUpdate:()=>()=>{},checkForUpdates:noop,startUpdate:noop,openReleasePage:noop,
} satisfies SettingsApi;
// The application must import only after the mock preload API is defined.
await import('../src/renderer/settings/main');
