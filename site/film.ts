import { ALL_PINGS, type PingId } from '../src/shared/pings';
import { DEFAULT_SETTINGS, overlaySettings } from '../src/shared/settings';
import type { Point } from '../src/shared/ipc';
import { emit } from './overlayShim';

export interface AudioCue { file: string; at: number }
declare global { interface Window { desksignalFilm?: { play(): Promise<{ duration: number; cues: AudioCue[] }> } } }

/** An authored virtual desktop using the application's real wheel, ping and emote renderer. */
export function initFilm(stage: HTMLElement): void {
  document.body.classList.add('film');
  const cursor = document.getElementById('cursor')!;
  const label = (step: string, title: string, detail: string) => {
    document.getElementById('film-step')!.textContent = step;
    document.getElementById('film-caption')!.textContent = title;
    document.getElementById('film-detail')!.textContent = detail;
  };
  const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
  const point = (x: number, y: number): Point => {
    const r = stage.getBoundingClientRect();
    return { x: r.left + x * r.width, y: r.top + y * r.height };
  };
  const place = (p: Point) => { cursor.style.transform = `translate(${p.x}px, ${p.y}px)`; };
  const glide = (a: Point, b: Point, ms: number, hover = false) => new Promise<void>((resolve) => {
    const start = performance.now();
    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const e = t < .5 ? 4*t*t*t : 1 - (-2*t+2)**3/2;
      const p = { x: a.x + (b.x-a.x)*e, y: a.y + (b.y-a.y)*e };
      place(p);
      if (hover) emit('wheel:move', p);
      if (t < 1) requestAnimationFrame(frame); else resolve();
    };
    requestAnimationFrame(frame);
  });
  window.desksignalFilm = {
    async play() {
      const start = performance.now();
      const cues: AudioCue[] = [];
      const track = (event: Event) => {
        const id = (event as CustomEvent<{id: PingId}>).detail.id;
        const def = ALL_PINGS.find(p => p.id === id)!;
        cues.push({ file: `sounds/${def.sound}.wav`, at: (performance.now()-start)/1000 });
      };
      window.addEventListener('desksignal:ping', track);
      emit('overlay:settings', overlaySettings({ ...DEFAULT_SETTINGS, muted: true, pingSizePx: 100, pingDurationS: 1.6, emoteSizePx: 150 }));
      label('DESKTOP SIGNAL STUDIO', '按住一个键，轮盘即刻出现。', '移动鼠标选择，松开 Option / Alt 发送，无需点击左键。');
      cursor.classList.add('on');
      let current = point(.53,.7);
      place(current);
      await wait(1100);
      const strokes = [
        { at: point(.32,.41), delta: {x:0,y:-160}, title:'危险，撤退！', hint:'按住 Option / Alt → 向上移动鼠标 → 松开按键' },
        { at: point(.72,.44), delta: {x:160,y:0}, title:'正在赶来。', hint:'朝你想传达的方向拖动，让伙伴一眼看懂。' },
        { at: point(.42,.42), delta: {x:0,y:160}, title:'这里需要协助。', hint:'轮盘在光标处展开，信号留在你指向的位置。' },
        { at: point(.68,.44), delta: {x:113,y:113}, title:'全力进攻！', hint:'熟悉的碰撞动画与音效，直接出现在桌面上。' },
      ];
      for (const [i, s] of strokes.entries()) {
        label(`0${i+1} / HOLD KEY · MOVE · RELEASE KEY`, s.title, s.hint);
        await glide(current,s.at,400);
        emit('wheel:open',s.at);
        await wait(180);
        const target = {x:s.at.x+s.delta.x,y:s.at.y+s.delta.y};
        await glide(s.at,target,450,true);
        await wait(400);
        emit('wheel:release',target);
        current=target;
        await wait(1450);
      }
      label('05 / A LITTLE PERSONALITY', '有时候，一个表情就够了。', 'Control / Ctrl 打开表情轮盘，还能添加自己的图片。');
      cursor.classList.remove('on');
      const emoteAt=point(.53,.4);
      cues.push({file:'emotes/bee_happy.ogg',at:(performance.now()-start)/1000});
      emit('emote:spawn',{owner:'film',art:{kind:'bundled',slug:'bee_happy'},...emoteAt});
      await wait(2300);
      emit('emote:clear',{owner:'film'});
      label('DESKSIGNAL / BY XIAOYU607', '下一次沟通，用一个信号开始。', '桌面信号 · 表情 · 共享房间 | 基于 lolPing 的独立改版');
      await wait(1600);
      window.removeEventListener('desksignal:ping',track);
      return {duration:(performance.now()-start)/1000,cues};
    },
  };
}
