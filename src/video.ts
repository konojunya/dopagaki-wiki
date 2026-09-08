import { mkdir, readFile, copyFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { atomic, json, hash, fileHash, RATE, FPS, ROOT, run, probe, log } from './common.js';
import { wav, type SpeechAsset } from './speech.js';
import type { Timeline } from './timeline.js';
export async function compose(t:Timeline,assets:SpeechAsset[],out:string,cache:string){
 // One PCM track avoids per-sentence AAC encoder delay. Padding comes from the same integer timeline.
 const pcm=Buffer.alloc(t.totalSamples*2);for(const seg of t.segments){const asset=assets.find(a=>a.id===seg.id)!;asset.pcm.copy(pcm,seg.startSample*2);}
 await atomic(join(out,'narration.wav'),wav(pcm));
 const list=t.slides.map(s=>`file 'slides/${s.id}.png'\noption framerate 30\nduration ${(s.endFrame-s.startFrame)/FPS}`).join('\n')+`\nfile 'slides/${t.slides.at(-1)!.id}.png'\noption framerate 30\n`;
 await atomic(join(out,'frames.ffconcat'),list);
 const ffmpeg=(await run('ffmpeg',['-version'])).stdout.split('\n')[0];
 const key=hash({pipeline:2,t,images:await Promise.all(t.slides.map(s=>fileHash(join(out,'slides',`${s.id}.png`)))),audio:assets.map(a=>a.key),ass:await fileHash(join(out,'subtitles.ass')),ffmpeg});
 await mkdir(join(cache,'videos'),{recursive:true});const cached=join(cache,'videos',`${key}.mp4`),target=join(out,'video.mp4');let hit=false;
 try{const receipt=JSON.parse(await readFile(cached+'.json','utf8'));if(receipt.sha256!==await fileHash(cached))throw new Error('Cache checksum mismatch');await copyFile(cached,target);hit=true;}catch{
  log('Encoding 1080p MP4');
  await run('ffmpeg',['-hide_banner','-loglevel','warning','-y','-threads','2','-f','concat','-safe','0','-i','frames.ffconcat','-i','narration.wav','-vf','ass=subtitles.ass:fontsdir=slides/fonts','-r',String(FPS),'-frames:v',String(t.totalFrames),'-c:v','libx264','-preset','ultrafast','-tune','stillimage','-crf','23','-pix_fmt','yuv420p','-threads','4','-c:a','aac','-b:a','128k','-ar',String(RATE),'-t',String(t.totalSamples/RATE),'-movflags','+faststart','-map_metadata','-1','video.tmp.mp4'],{cwd:out,timeout:600000});
  await rename(join(out,'video.tmp.mp4'),target);await copyFile(target,cached);await json(cached+'.json',{sha256:await fileHash(cached)});
 }
 return {target,hit,ffmpeg,key};
}
export async function verifyVideo(path:string,t:Timeline){
 const p=await probe(path),v=p.streams.find((s:any)=>s.codec_type==='video'),a=p.streams.find((s:any)=>s.codec_type==='audio');
 const errors:string[]=[];if(v?.width!==1920||v?.height!==1080||v?.codec_name!=='h264'||v?.pix_fmt!=='yuv420p'||v?.r_frame_rate!=='30/1')errors.push('Video format mismatch');
 if(a?.codec_name!=='aac'||Number(a?.sample_rate)!==RATE)errors.push('Audio format mismatch');
 if(Number(v?.nb_frames)!==t.totalFrames)errors.push('Frame count mismatch');
 const expected=t.totalSamples/RATE,tolerance=1/FPS+1024/RATE;
 for(const [name,actual] of [['container',p.format.duration],['video',v?.duration],['audio',a?.duration]] as const)if(!Number.isFinite(Number(actual))||Math.abs(Number(actual)-expected)>tolerance)errors.push(`${name} duration mismatch`);
 await run('ffmpeg',['-v','error','-xerror','-i',path,'-f','null','-'],{timeout:600000});
 if(errors.length)throw new Error(`Video validation: ${errors.join('; ')}`);
 return {passed:true,decoded:true,expectedSeconds:expected,actualSeconds:Number(p.format.duration),frames:Number(v.nb_frames),width:v.width,height:v.height,fps:v.r_frame_rate,videoCodec:v.codec_name,audioCodec:a.codec_name,bytes:Number(p.format.size),toleranceSeconds:tolerance};
}
