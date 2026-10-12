import {
  AUDIO_MAX_BYTES, VIDEO_MAX_BYTES, MEDIA_MAX_SECONDS, ANIM_MAX_BYTES, ANIM_MAX_SIDE, INPUT_MAX_BYTES, INPUT_MAX_SIDE, STILL_FALLBACK_SIDE, STILL_MAX_BYTES, STILL_SIDE, type EmoteFile, type ImportError,
} from '../../shared/emotes';
import { sniffAudio, sniffVideo } from '../../shared/mediaSniff';
import { imageSize, sniffImage, type ImageType } from '../../shared/imageSniff';

export type Prepared = { ok: true; file: EmoteFile } | { ok: false; error: ImportError };

const QUALITIES: readonly number[] = [0.85, 0.75, 0.65, 0.55, 0.45];
const MIME: Record<ImageType, string> = { png: 'image/png', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' };

const fail = (error: ImportError): Prepared => ({ ok: false, error });

/** The still's encodings, in the order tried: each quality at 160 px, then each again at 128 px. */
export function stillAttempts(): { side: number; quality: number }[] {
  return [STILL_SIDE, STILL_FALLBACK_SIDE].flatMap((side) => QUALITIES.map((quality) => ({ side, quality })));
}

/** Scales (w, h) so its longest side is `side`, never up, and never to less than a pixel. */
export function fitSize(w: number, h: number, side: number): { width: number; height: number } {
  const scale = Math.min(1, side / Math.max(w, h));
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
}

/** PNG, JPEG, GIF or WebP by its first bytes, whatever the file is called, and at most INPUT_MAX_BYTES. */
export function checkInput(bytes: Uint8Array): ImportError | null {
  if (!sniffImage(bytes)) return 'type';
  return bytes.length > INPUT_MAX_BYTES ? 'size' : null;
}

/**
 * The size the image's header declares, read before decoding anything: a tiny file can claim 30000 x 30000 pixels, which
 * would take gigabytes to decode. Over INPUT_MAX_SIDE on either side is 'size' (the same error as too many bytes, whose message
 * names both limits); a header that can't be read is not a usable image ('type', as an image that fails to decode already is).
 */
export function checkDimensions(bytes: Uint8Array): ImportError | null {
  const size = imageSize(bytes);
  if (!size) return 'type';
  return Math.max(size.width, size.height) > INPUT_MAX_SIDE ? 'size' : null;
}

/** An animation is kept as it is, so it has to be small enough for the overlay to decode on every emote. */
export function checkAnimation(bytes: Uint8Array, width: number, height: number): ImportError | null {
  return bytes.length > ANIM_MAX_BYTES || Math.max(width, height) > ANIM_MAX_SIDE ? 'animSize' : null;
}

/** The file name without its extension (main sanitises it). */
export const nameFromFile = (fileName: string): string => fileName.replace(/(.)\.[^.]*$/, '$1');

/** The first encoding of `frame` that fits STILL_MAX_BYTES, or null when even the smallest is too big. */
async function encodeStill(frame: VideoFrame): Promise<Uint8Array | null> {
  let canvas: OffscreenCanvas | null = null;
  for (const { side, quality } of stillAttempts()) {
    const size = fitSize(frame.displayWidth, frame.displayHeight, side);
    if (!canvas || canvas.width !== size.width || canvas.height !== size.height) {
      canvas = new OffscreenCanvas(size.width, size.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(frame, 0, 0, size.width, size.height);
    }
    const blob = await canvas.convertToBlob({ type: 'image/webp', quality });
    if (blob.type === 'image/webp' && blob.size <= STILL_MAX_BYTES) return new Uint8Array(await blob.arrayBuffer());
  }
  return null;
}

/**
 * Turns a picked or dropped file into what main saves: a small WebP still of its first frame and, for a GIF or WebP with
 * more than one frame, the original bytes as the animation.
 */
async function prepareImage(file: File): Promise<Prepared> {
  if (file.size > INPUT_MAX_BYTES) {
    // Refused without reading the rest of what may be a huge file.
    return fail(sniffImage(new Uint8Array(await file.slice(0, 16).arrayBuffer())) ? 'size' : 'type');
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const bad = checkInput(bytes) ?? checkDimensions(bytes);
  if (bad) return fail(bad);
  const type = sniffImage(bytes) as ImageType;

  let decoder: ImageDecoder | null = null;
  let frame: VideoFrame | null = null;
  try {
    decoder = new ImageDecoder({ data: bytes, type: MIME[type] });
    await Promise.all([decoder.tracks.ready, decoder.completed]); // all the data is in, so the frame count is final
    const frames = decoder.tracks.selectedTrack?.frameCount ?? 1;
    frame = (await decoder.decode({ frameIndex: 0 })).image;
    const animated = (type === 'gif' || type === 'webp') && frames > 1;
    if (animated) {
      const tooBig = checkAnimation(bytes, frame.displayWidth, frame.displayHeight);
      if (tooBig) return fail(tooBig);
    }
    const still = await encodeStill(frame);
    if (!still) return fail('detail');
    const name = nameFromFile(file.name);
    return { ok: true, file: animated ? { name, still, anim: bytes } : { name, still } };
  } catch {
    return fail('type'); // looked like an image, but doesn't decode
  } finally {
    frame?.close();
    decoder?.close();
  }
}

/** Probe actual playback metadata with the same Chromium codecs used by the desktop overlay. */
async function probeMedia(bytes: Uint8Array, type: string, video: boolean): Promise<{ element: HTMLMediaElement; dispose: () => void }> {
  const element = document.createElement(video ? 'video' : 'audio');
  const url = URL.createObjectURL(new Blob([bytes.slice().buffer], { type }));
  element.preload = 'auto';
  element.muted = true;
  const dispose = () => { element.pause(); element.removeAttribute('src'); element.load(); URL.revokeObjectURL(url); };
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => finish(new Error('decode timeout')), 12000);
      const finish = (error?: Error) => {
        clearTimeout(timeout); element.onloadeddata = null; element.onerror = null;
        error ? reject(error) : resolve();
      };
      element.onloadeddata = () => finish();
      element.onerror = () => finish(new Error('unsupported codec'));
      element.src = url;
    });
    return { element, dispose };
  } catch (error) { dispose(); throw error; }
}

export async function prepareEmote(file: File, audioFile?: File): Promise<Prepared> {
  const header = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  const videoType = sniffVideo(header);
  let prepared: Prepared;
  if (videoType) {
    if (file.size > VIDEO_MAX_BYTES) return fail('mediaSize');
    let probe: Awaited<ReturnType<typeof probeMedia>> | undefined;
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      probe = await probeMedia(bytes, `video/${videoType}`, true);
      const video = probe.element as HTMLVideoElement;
      if (!Number.isFinite(video.duration) || video.duration <= 0 || video.duration > MEDIA_MAX_SECONDS) return fail('duration');
      if (!video.videoWidth || !video.videoHeight) return fail('type');
      if (Math.max(video.videoWidth, video.videoHeight) > ANIM_MAX_SIDE) return fail('mediaSize');
      const frame = new VideoFrame(video, { timestamp: 0 });
      let still: Uint8Array | null;
      try { still = await encodeStill(frame); } finally { frame.close(); }
      if (!still) return fail('detail');
      prepared = { ok: true, file: { name: nameFromFile(file.name), still, video: bytes, duration: video.duration } };
    } catch { return fail('type'); } finally { probe?.dispose(); }
    return prepared; // videos keep their embedded sound; a separate selected track is only paired with images
  }
  prepared = await prepareImage(file);
  if (!prepared.ok || !audioFile) return prepared;
  if (audioFile.size > AUDIO_MAX_BYTES) return fail('mediaSize');
  let probe: Awaited<ReturnType<typeof probeMedia>> | undefined;
  try {
    const audio = new Uint8Array(await audioFile.arrayBuffer());
    const type = sniffAudio(audio);
    if (!type) return fail('type');
    const mime = { mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4' }[type];
    probe = await probeMedia(audio, mime, false);
    const duration = probe.element.duration;
    if (!Number.isFinite(duration) || duration <= 0 || duration > MEDIA_MAX_SECONDS) return fail('duration');
    return { ok: true, file: { ...prepared.file, audio, duration } };
  } catch { return fail('type'); } finally { probe?.dispose(); }
}
