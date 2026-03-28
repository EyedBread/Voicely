import { Mp3Encoder } from "lamejsfix";

const DEFAULT_BITRATE_KBPS = 64;
const MP3_FRAME_SAMPLES = 1152;

function bufferToInt16Array(pcm: Buffer): Int16Array {
  return new Int16Array(
    pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + pcm.byteLength),
  );
}

export function encodePcmToMp3Base64(
  pcm: Buffer,
  sampleRate: number,
  channels = 1,
  kbps = DEFAULT_BITRATE_KBPS,
): string {
  if (pcm.length === 0) {
    return "";
  }

  const encoder = new Mp3Encoder(channels, sampleRate, kbps);
  const pcmSamples = bufferToInt16Array(pcm);
  const mp3Chunks: Buffer[] = [];

  for (let i = 0; i < pcmSamples.length; i += MP3_FRAME_SAMPLES) {
    const frame = pcmSamples.subarray(i, i + MP3_FRAME_SAMPLES);
    const encoded = encoder.encodeBuffer(frame);
    if (encoded.length > 0) {
      mp3Chunks.push(Buffer.from(encoded));
    }
  }

  const flushed = encoder.flush();
  if (flushed.length > 0) {
    mp3Chunks.push(Buffer.from(flushed));
  }

  return Buffer.concat(mp3Chunks).toString("base64");
}

export function createSilentPcm(durationMs: number, sampleRate: number): Buffer {
  const samples = Math.max(1, Math.round((durationMs / 1000) * sampleRate));
  return Buffer.alloc(samples * 2);
}

export function createSilentMp3Base64(
  durationMs: number,
  sampleRate: number,
  channels = 1,
  kbps = DEFAULT_BITRATE_KBPS,
): string {
  return encodePcmToMp3Base64(
    createSilentPcm(durationMs, sampleRate),
    sampleRate,
    channels,
    kbps,
  );
}
