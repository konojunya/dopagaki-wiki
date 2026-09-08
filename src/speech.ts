import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { atomic, hash, RATE, run, log, json, readJson } from "./common.js";
import type { Story } from "./schema.js";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export class Voicevox {
  url: string;
  constructor(url = process.env.VOICEVOX_URL ?? "http://127.0.0.1:50021") {
    this.url = url.replace(/\/$/, "");
  }
  async request(path: string, init: RequestInit = {}, timeout = 120000) {
    let last: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const r = await fetch(this.url + path, {
          ...init,
          signal: AbortSignal.timeout(timeout),
        });
        if (!r.ok) {
          if (r.status < 500)
            throw new TypeError(
              `VOICEVOX ${path.split("?")[0]} HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`,
            );
          throw new Error(`VOICEVOX HTTP ${r.status}`);
        }
        return r;
      } catch (e) {
        if (e instanceof TypeError && e.message.startsWith("VOICEVOX")) throw e;
        last = e;
        if (attempt < 2) await sleep(400 * (attempt + 1));
      }
    }
    throw new Error(
      `VOICEVOX unavailable at ${this.url}. Start with open -a VOICEVOX or set VOICEVOX_URL. ${last}`,
    );
  }
  async connect(autoStart = false) {
    try {
      await fetch(this.url + "/version", {
        signal: AbortSignal.timeout(2000),
      }).then((r) => {
        if (!r.ok) throw new Error("Not ready");
      });
    } catch (e) {
      if (
        !autoStart ||
        process.platform !== "darwin" ||
        !/^http:\/\/(127\.0\.0\.1|localhost):50021$/.test(this.url)
      )
        throw new Error(
          `VOICEVOX not running at ${this.url}. Run open -a VOICEVOX, then doctor --start-voicevox. ${e}`,
        );
      await run("open", ["-a", "VOICEVOX"]);
      const until = Date.now() + 45000;
      let ready = false;
      while (Date.now() < until) {
        try {
          const r = await fetch(this.url + "/version", {
            signal: AbortSignal.timeout(1500),
          });
          if (r.ok) {
            ready = true;
            break;
          }
        } catch {}
        await sleep(1000);
      }
      if (!ready)
        throw new Error(
          "VOICEVOX startup exceeded 45 seconds; open the app and check its engine settings.",
        );
    }
    return (await this.request("/version", {}, 3000)).json();
  }
  async resolve(voice: Story["voice"]) {
    const version = await this.connect(),
      speakers = (await (await this.request("/speakers")).json()) as any[];
    const speaker = speakers.find((s) => s.name === voice.speaker),
      style = speaker?.styles.find(
        (s: any) => s.name === voice.style && (!s.type || s.type === "talk"),
      );
    if (!style)
      throw new Error(
        `Voice ${voice.speaker}/${voice.style} unavailable. Check /speakers.`,
      );
    const engine = (await (
      await this.request("/engine_manifest")
    ).json()) as any;
    return {
      version,
      speaker: voice.speaker,
      speakerUuid: speaker.speaker_uuid,
      speakerVersion: speaker.version,
      userDictionarySha256: hash(
        await (await this.request("/user_dict")).json(),
      ),
      style: voice.style,
      styleId: style.id,
      engineUuid: engine.uuid,
      coreVersions: await (await this.request("/core_versions")).json(),
    };
  }
}
export function pronunciation(
  text: string,
  dictionary: Record<string, string>,
) {
  const keys = Object.keys(dictionary).sort((a, b) => b.length - a.length);
  if (!keys.length) return text;
  return text.replace(
    new RegExp(
      keys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"),
      "g",
    ),
    (m) => dictionary[m]!,
  );
}
export function wavData(buffer: Buffer) {
  if (
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WAVE"
  )
    throw new Error("Invalid WAV");
  let format = false;
  for (let p = 12; p + 8 <= buffer.length; ) {
    const tag = buffer.toString("ascii", p, p + 4),
      n = buffer.readUInt32LE(p + 4);
    if (p + 8 + n > buffer.length) throw new Error("Truncated WAV");
    if (tag === "fmt ") {
      if (
        buffer.readUInt16LE(p + 8) !== 1 ||
        buffer.readUInt16LE(p + 10) !== 1 ||
        buffer.readUInt32LE(p + 12) !== RATE ||
        buffer.readUInt16LE(p + 22) !== 16
      )
        throw new Error("Expected PCM mono 48kHz s16");
      format = true;
    }
    if (tag === "data") {
      if (!format || n === 0 || n % 2) throw new Error("Invalid PCM data");
      return buffer.subarray(p + 8, p + 8 + n);
    }
    p += 8 + n + (n % 2);
  }
  throw new Error("Missing WAV data");
}
export function wav(pcm: Buffer) {
  const h = Buffer.alloc(44);
  h.write("RIFF");
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write("WAVEfmt ", 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}
export type SpeechAsset = {
  id: string;
  key: string;
  path: string;
  samples: number;
  pcm: Buffer;
  hit: boolean;
};
export async function synthesize(story: Story, cache: string) {
  const client = new Voicevox(),
    identity = await client.resolve(story.voice);
  await mkdir(join(cache, "speech"), { recursive: true });
  const assets: SpeechAsset[] = [];
  for (const seg of story.slides.flatMap((s) => s.narration)) {
    const settings = {
      speedScale: story.voice.speed,
      pitchScale: 0,
      intonationScale: 1,
      volumeScale: 1,
      prePhonemeLength: 0.08,
      postPhonemeLength: 0.12,
      outputSamplingRate: RATE,
      outputStereo: false,
    };
    const spoken = pronunciation(seg.text, story.voice.dictionary),
      key = hash({
        adapter: 1,
        text: seg.text,
        spoken,
        dictionary: story.voice.dictionary,
        identity,
        settings,
      }),
      path = join(cache, "speech", `${key}.wav`);
    let pcm: Buffer | undefined,
      hit = false;
    try {
      const b = await readFile(path);
      if ((await readJson(path + ".json")).sha256 !== hash(b))
        throw new Error("Speech cache checksum mismatch");
      pcm = wavData(b);
      hit = true;
    } catch {}
    if (!pcm) {
      log(`TTS ${seg.id}`);
      const q = (await (
        await client.request(
          `/audio_query?text=${encodeURIComponent(spoken)}&speaker=${identity.styleId}`,
          { method: "POST" },
        )
      ).json()) as object;
      const response = await client.request(
        `/synthesis?speaker=${identity.styleId}&enable_interrogative_upspeak=true`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...q, ...settings }),
        },
      );
      const b = Buffer.from(await response.arrayBuffer());
      pcm = wavData(b);
      await atomic(path, b);
      await json(path + ".json", { sha256: hash(b) });
    }
    assets.push({ id: seg.id, key, path, samples: pcm.length / 2, pcm, hit });
  }
  return { identity, assets, hits: assets.filter((a) => a.hit).length };
}
