/** Container signatures, independent of a user-controlled filename or MIME. Decoding happens in the settings renderer. */
const at = (b: Uint8Array, s: string, offset = 0): boolean =>
  b.length >= offset + s.length && [...s].every((c, i) => b[offset + i] === c.charCodeAt(0));
export type VideoType = 'mp4' | 'webm';
export type AudioType = 'mp3' | 'wav' | 'ogg' | 'm4a';
export function sniffVideo(b: Uint8Array): VideoType | null {
  if (b.length >= 12 && at(b, 'ftyp', 4)) return 'mp4';
  if (b.length >= 4 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return 'webm';
  return null;
}
export function sniffAudio(b: Uint8Array): AudioType | null {
  if (at(b, 'RIFF') && at(b, 'WAVE', 8)) return 'wav';
  if (at(b, 'OggS')) return 'ogg';
  if (at(b, 'ID3') || (b.length >= 2 && b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return 'mp3';
  if (at(b, 'ftyp', 4)) return 'm4a';
  return null;
}
