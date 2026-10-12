import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Wheel } from '../../src/renderer/overlay/wheel';

class Svg {
  id = 'emoteWheel';
  textContent = '';
  innerHTML = '';
  style: Record<string, string> = {};
  children: Svg[] = [];
  attrs = new Map<string, string>();
  classes = new Set<string>();
  classList = {
    add: (...c: string[]) => c.forEach((s) => this.classes.add(s)),
    remove: (...c: string[]) => c.forEach((s) => this.classes.delete(s)),
    toggle: (c: string, on: boolean) => on ? this.classes.add(c) : this.classes.delete(c),
  };
  setAttribute(k: string, v: string): void { this.attrs.set(k, v); }
  removeAttribute(k: string): void { this.attrs.delete(k); }
  append(el: Svg): void { this.children.push(el); }
}
beforeEach(() => vi.stubGlobal('document', { createElementNS: () => new Svg() }));
afterEach(() => vi.unstubAllGlobals());
const setup = () => {
  const svg = new Svg();
  const wheel = new Wheel(svg as unknown as SVGSVGElement, 'EMOTE', 'default.png', () => undefined);
  wheel.setItems(Array.from({ length: 8 }, (_, i) => ({ key: `slot${i}`, icon: `${i}.png` })));
  return { wheel, svg };
};

describe('wheel centre selection', () => {
  it('uses the assigned centre emote when confirming without moving', () => {
    const { wheel, svg } = setup();
    wheel.setCenter({ key: 'facepalm', icon: 'facepalm.png' });
    wheel.open(-100, 200);
    expect(svg.classes.has('centerHot')).toBe(true);
    expect(wheel.release(-100, 200)).toEqual({ key: 'facepalm', x: -100, y: 200 });
    expect(wheel.release(-100, 200)).toBeNull(); // a later release cannot duplicate
    expect(svg.classes.has('centerHot')).toBe(false);
  });
  it('updates both the icon and selection for an imported centre emote', () => {
    const { wheel, svg } = setup();
    wheel.setCenter({ key: 'facepalm', icon: 'facepalm.png' });
    const ref = `c:${'ab'.repeat(16)}`;
    wheel.setCenter({ key: ref, icon: `lolping://emotes/${ref.slice(2)}.webp` });
    const hub = svg.children.find((c) => c.attrs.get('class') === 'hub')!;
    expect(hub.attrs.get('href')).toContain(ref.slice(2));
    wheel.open(100, 100);
    wheel.move(240, 100);
    expect(svg.classes.has('centerHot')).toBe(false);
    wheel.move(105, 105);
    expect(svg.classes.has('centerHot')).toBe(true);
    expect(wheel.release(105, 105)?.key).toBe(ref);
  });
  it('still chooses a slice outside the centre and cancels explicitly', () => {
    const { wheel } = setup();
    wheel.setCenter({ key: 'centre', icon: 'centre.png' });
    wheel.open(100, 100);
    expect(wheel.release(240, 100)?.key).toBe('slot2');
    wheel.open(100, 100); wheel.cancel();
    expect(wheel.release(100, 100)).toBeNull();
  });
  it('keeps a dead zone only when no centre action is assigned', () => {
    const { wheel } = setup();
    wheel.open(100, 100);
    expect(wheel.release(100, 100)).toBeNull();
  });
});
