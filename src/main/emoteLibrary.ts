import { createHash } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  AUDIO_MAX_BYTES, VIDEO_MAX_BYTES, MEDIA_MAX_SECONDS, customEmoteArt, ANIM_MAX_BYTES, ANIM_MAX_SIDE, CUSTOM_NAME_MAX, MAX_CUSTOM_EMOTES, STILL_MAX_BYTES, STILL_SIDE, customAnimUrl, customHash,
  customStillUrl, isBundledEmote, isCustomRef, type CustomEmote, type EmoteArt, type EmoteFile, type EmoteRef, type ImportError,
} from '../shared/emotes';
import { gifExtent, isAnimatedWebp, sniffImage, webpSize } from '../shared/imageSniff';
import { sniffAudio, sniffVideo } from '../shared/mediaSniff';
import { sanitizeName } from '../shared/roomProtocol';
import { isFile } from './fileState';
import { renameWithRetry } from './settingsStore';

export type SaveResult = { ok: true; emote: CustomEmote } | { ok: false; error: ImportError };

const fail = (error: ImportError): SaveResult => ({ ok: false, error });
const longest = (size: { width: number; height: number }): number => Math.max(size.width, size.height);

/** An import as it arrived over IPC, rebuilt from its known fields: a string name and byte arrays. Null for anything else. */
export function emoteFileFrom(raw: unknown): EmoteFile | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { name, still, anim, video, audio, duration } = raw as Record<string, unknown>;
  if (typeof name !== 'string' || !(still instanceof Uint8Array)) return null;
  if ([anim, video, audio].some((v) => v !== undefined && !(v instanceof Uint8Array))) return null;
  if (video !== undefined && (anim !== undefined || audio !== undefined)) return null;
  if ((video !== undefined || audio !== undefined) && (typeof duration !== 'number' || !Number.isFinite(duration))) return null;
  return { name, still, ...(anim ? { anim: anim as Uint8Array } : {}),
    ...(video ? { video: video as Uint8Array } : {}), ...(audio ? { audio: audio as Uint8Array } : {}),
    ...(video !== undefined || audio !== undefined ? { duration: duration as number } : {}) };
}

/** The still the settings window encoded: a still WebP of at most STILL_MAX_BYTES and STILL_SIDE px. */
function checkStill(b: Uint8Array): ImportError | null {
  if (sniffImage(b) !== 'webp' || isAnimatedWebp(b)) return 'type'; // the still is served as an <img> on every overlay: it must not move
  if (b.length > STILL_MAX_BYTES) return 'size';
  const size = webpSize(b);
  return size && longest(size) <= STILL_SIDE ? null : 'type';
}

/** The original animation: a GIF or WebP, small enough to decode on every emote. */
function checkAnim(b: Uint8Array): ImportError | null {
  const type = sniffImage(b);
  if (type !== 'gif' && type !== 'webp') return 'type';
  if (b.length > ANIM_MAX_BYTES) return 'animSize';
  const size = type === 'gif' ? gifExtent(b) : webpSize(b);
  if (!size) return 'type';
  return longest(size) > ANIM_MAX_SIDE ? 'animSize' : null;
}

/** What an emote looks like on screen. A room member's imported emote shows as its still, and only when it is one of ours too. */
export function resolveEmoteArt(ref: EmoteRef, custom: readonly CustomEmote[], remote: boolean): EmoteArt {
  if (isBundledEmote(ref)) return { kind: 'bundled', slug: ref };
  const emote = isCustomRef(ref) ? custom.find((c) => c.id === ref) : undefined;
  if (!emote) return { kind: 'placeholder' };
  return customEmoteArt(emote, remote);
}

/**
 * Imported emotes on disk: `<hash>.webp` (the still) and `<hash>.anim.gif|webp` (the original animation) in `dir`.
 * Everything that arrives is checked again here, whatever the settings window already checked, and the id is computed here.
 */
export class EmoteLibrary {
  /** `dir` is <settings folder>/emotes. */
  constructor(readonly dir: string) {}

  async save(file: EmoteFile, existing: readonly CustomEmote[]): Promise<SaveResult> {
    const f = emoteFileFrom(file);
    if (!f) return fail('type');
    const error = checkStill(f.still) ?? (f.anim ? checkAnim(f.anim) : null);
    if (error) return fail(error);
    if (f.video && !sniffVideo(f.video) || f.audio && !sniffAudio(f.audio)) return fail('type');
    if (f.video && f.video.length > VIDEO_MAX_BYTES || f.audio && f.audio.length > AUDIO_MAX_BYTES) return fail('mediaSize');
    if ((f.video || f.audio) && (!f.duration || f.duration <= 0 || f.duration > MEDIA_MAX_SECONDS)) return fail('duration');
    const digest = createHash('sha256').update(f.still);
    // Preserve old image IDs; media imports include every track so one GIF can have different sounds.
    if (f.video || f.audio) { if (f.anim) digest.update(f.anim); if (f.video) digest.update(f.video); if (f.audio) digest.update(f.audio); }
    const hash = digest.digest('hex').slice(0, 32);
    const id = `c:${hash}`;
    if (existing.some((c) => c.id === id)) return fail('duplicate');
    if (existing.length >= MAX_CUSTOM_EMOTES) return fail('full');

    const animName = f.anim ? `${hash}.anim.${sniffImage(f.anim)}` : null;
    const videoName = f.video ? `${hash}.video.${sniffVideo(f.video)}` : null;
    const audioName = f.audio ? `${hash}.audio.${sniffAudio(f.audio)}` : null;
    const files = [{ name: `${hash}.webp`, data: f.still }, ...(f.anim && animName ? [{ name: animName, data: f.anim }] : []),
      ...(f.video && videoName ? [{ name: videoName, data: f.video }] : []),
      ...(f.audio && audioName ? [{ name: audioName, data: f.audio }] : [])];
    // Files left by an earlier copy of this image: an animation in the other format would be served instead of this one.
    const stale = this.names(hash).filter((n) => !files.some((f) => f.name === n));
    try {
      await this.write(files, stale);
    } catch (err) {
      console.warn('[emotes] import failed:', (err as Error).message);
      return fail('disk');
    }
    // A name with nothing left shows the first characters of its hash, as in normalizeSettings.
    const name = sanitizeName(f.name.slice(0, 256), hash.slice(0, 6), CUSTOM_NAME_MAX);
    return { ok: true, emote: { id, name, animated: f.anim !== undefined || f.video !== undefined,
      ...(f.video ? { video: true, duration: f.duration } : {}), ...(f.audio ? { audio: true, duration: f.duration } : {}) } };
  }

  /** Deletes an emote's files. Best effort: a file that can't be deleted is only an orphan, which a later import overwrites. */
  async remove(id: EmoteRef): Promise<void> {
    if (!isCustomRef(id)) return;
    const hash = customHash(id);
    await Promise.all(this.names(hash).map((n) =>
      rm(join(this.dir, n), { force: true }).catch((err: Error) => console.warn('[emotes] could not delete', n, err.message))));
  }

  /**
   * The entries whose still exists (run at launch, before anything reads them). When the folder can't be read at all (no
   * permission, say) nothing is known about its files, so the entries stay rather than the user's list being emptied.
   */
  present(list: readonly CustomEmote[]): CustomEmote[] {
    return list.filter((c) => isCustomRef(c.id) && isFile(join(this.dir, `${customHash(c.id)}.webp`), true));
  }

  private names(hash: string): string[] {
    return [`${hash}.webp`, `${hash}.anim.gif`, `${hash}.anim.webp`, ...['mp4', 'webm'].map((e) => `${hash}.video.${e}`),
      ...['mp3', 'wav', 'ogg', 'm4a'].map((e) => `${hash}.audio.${e}`)];
  }

  /** Every file goes to a temp name first, then all are renamed. On any failure none of them is left behind. */
  private async write(files: readonly { name: string; data: Uint8Array }[], stale: readonly string[]): Promise<void> {
    const paths = files.map((f) => join(this.dir, f.name));
    const temps = paths.map((p) => `${p}.tmp`);
    try {
      await mkdir(this.dir, { recursive: true });
      for (const n of stale) await rm(join(this.dir, n), { force: true });
      for (let i = 0; i < files.length; i++) await writeFile(temps[i], files[i].data);
      for (let i = 0; i < files.length; i++) await renameWithRetry(temps[i], paths[i]);
    } catch (err) {
      await Promise.all([...temps, ...paths].map((p) => rm(p, { force: true }).catch(() => undefined)));
      throw err;
    }
  }
}
