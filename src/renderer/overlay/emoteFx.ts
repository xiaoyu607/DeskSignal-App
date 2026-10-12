import { MEDIA_MAX_SECONDS, EMOTE_DURATION_S, emoteAnimUrl, type EmoteArt } from '../../shared/emotes';
import type { PingTag } from '../../shared/ipc';
import { TAG_COLORS } from '../../shared/roomColors';

export interface EmoteOptions {
  /** How wide the emote's art appears. */
  sizePx: number;
  /** A room member's name under the emote. */
  tag?: PingTag;
  volume?: number;
}

interface Live {
  root: HTMLElement;
  timer: ReturnType<typeof setTimeout>;
  /** The object URL of a bundled emote's image, once its Blob has arrived. */
  url: string | null;
  gone: boolean;
  media: HTMLMediaElement[];
}

const div = (cls: string): HTMLDivElement => {
  const d = document.createElement('div');
  d.className = cls;
  return d;
};

function image(cls = ''): HTMLImageElement {
  const el = document.createElement('img');
  if (cls) el.className = cls;
  el.alt = '';
  el.draggable = false;
  return el;
}

/** What stands in for an emote whose files are missing. */
function bubble(): HTMLDivElement {
  const b = div('bubble');
  b.textContent = '?';
  return b;
}

/** The CSS envelope a custom image or the placeholder plays in: what the baked animation does for a bundled emote. */
function envelope(child: HTMLElement): HTMLDivElement {
  const fx = div('fx');
  fx.append(child);
  return fx;
}

async function fetchImage(url: string): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(String(res.status));
  return res.blob();
}

/** The emotes on this overlay: at most one per owner ('self', 'preview' or a room member's id), each gone after EMOTE_DURATION_S. */
export class EmoteStage {
  private readonly live = new Map<string, Live>();
  private readonly blobs = new Map<string, Promise<Blob>>();

  constructor(private readonly layer: HTMLElement, private readonly fetchBlob: (url: string) => Promise<Blob> = fetchImage) {}

  /** Shows `art` centred on (x, y), replacing the owner's emote if it has one on screen. */
  spawn(owner: string, art: EmoteArt, x: number, y: number, opts: EmoteOptions): void {
    this.clear(owner);
    const root = div('emote');
    root.style.left = `${x}px`;
    root.style.top = `${y}px`;
    root.style.setProperty('--size', `${opts.sizePx}px`);
    const duration = art.kind === 'custom' && art.duration && Number.isFinite(art.duration)
      ? Math.min(MEDIA_MAX_SECONDS, Math.max(art.video ? 0.1 : EMOTE_DURATION_S, art.duration)) : EMOTE_DURATION_S;
    root.style.setProperty('--dur', `${duration}s`);
    const live: Live = {
      root, url: null, gone: false, media: [],
      timer: setTimeout(() => this.end(owner, live), duration * 1000 + 150),
    };
    this.live.set(owner, live);

    if (art.kind === 'bundled') this.showBundled(live, art.slug);
    else if (art.kind === 'custom') {
      if (art.video) {
        const video = document.createElement('video');
        video.className = 'customVideo';
        video.playsInline = true;
        video.addEventListener('error', () => { if (!live.gone) video.replaceWith(bubble()); }, { once: true });
        root.append(envelope(video));
        this.playMedia(owner, live, video, art.url, opts.volume ?? 0, duration);
      } else {
        const img = image();
        img.addEventListener('error', () => { if (!live.gone) img.replaceWith(bubble()); }, { once: true });
        root.append(envelope(img));
        if (art.animated) {
          // Each GIF gets its own URL so repeat sends restart at the first frame.
          this.fetchBlob(art.url).then((blob) => {
            if (live.gone) return;
            live.url = URL.createObjectURL(blob); img.src = live.url;
          }, () => { if (!live.gone) img.replaceWith(bubble()); });
        } else img.src = art.url;
        if (art.audioUrl) {
          const audio = document.createElement('audio');
          root.append(audio);
          this.playMedia(owner, live, audio, art.audioUrl, opts.volume ?? 0, duration);
        }
      }
    } else {
      root.append(envelope(bubble()));
    }

    if (opts.tag) {
      const tag = div('tag');
      tag.textContent = opts.tag.name; // never HTML: the name comes from another machine
      tag.style.setProperty('--tag', TAG_COLORS[opts.tag.color] ?? TAG_COLORS[0]);
      root.append(tag);
    }
    this.layer.append(root);
  }

  /** Removes the owner's emote at once, if it has one. */
  clear(owner: string): void {
    const live = this.live.get(owner);
    if (live) this.end(owner, live);
  }

  /** Apply the sound switches immediately to custom media already playing. */
  setVolume(volume: number): void {
    for (const live of this.live.values()) for (const media of live.media) {
      media.volume = Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : 0;
      media.muted = media.volume === 0;
    }
  }

  /**
   * The baked animation plays once from frame 0, but Chromium gives images with the same URL one shared clock, so each
   * spawn gets its own object URL (the Blob is fetched once per emote).
   */
  private showBundled(live: Live, slug: string): void {
    const img = image('sheet');
    live.root.append(img);
    // A missing file (the asset check lists it in About) or one that arrives but can't be decoded: the placeholder plays
    // instead, for the emote's usual time. It replaces the sheet once, and not at all after the emote is gone.
    let swapped = false;
    const placeholder = (): void => {
      if (swapped || live.gone) return;
      swapped = true;
      img.replaceWith(envelope(bubble()));
    };
    img.addEventListener('error', placeholder, { once: true });
    this.blob(slug).then(
      (blob) => {
        if (live.gone) return;
        live.url = URL.createObjectURL(blob);
        img.src = live.url;
      },
      placeholder,
    );
  }

  private blob(slug: string): Promise<Blob> {
    let blob = this.blobs.get(slug);
    if (!blob) {
      blob = this.fetchBlob(emoteAnimUrl(slug));
      this.blobs.set(slug, blob);
      const fetched = blob;
      blob.catch(() => {
        if (this.blobs.get(slug) === fetched) this.blobs.delete(slug); // try again next time
      });
    }
    return blob;
  }

  private playMedia(owner: string, live: Live, media: HTMLMediaElement, url: string, volume: number, duration: number): void {
    live.media.push(media);
    media.volume = Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : 0;
    media.muted = media.volume === 0;
    media.preload = 'auto';
    media.addEventListener('playing', () => {
      if (live.gone) { media.pause(); return; }
      clearTimeout(live.timer);
      live.timer = setTimeout(() => this.end(owner, live), duration * 1000 + 150);
    }, { once: true });
    media.src = url;
    void media.play().catch(() => { /* Missing codecs/files leave the art visible until its timer ends. */ });
  }

  private end(owner: string, live: Live): void {
    if (live.gone) return;
    live.gone = true;
    clearTimeout(live.timer);
    for (const media of live.media) { media.pause(); media.removeAttribute('src'); media.load(); }
    live.root.remove();
    if (live.url) URL.revokeObjectURL(live.url);
    if (this.live.get(owner) === live) this.live.delete(owner);
  }
}
