import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
export const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const RATE=48000, FPS=30, SPF=RATE/FPS;
export const hash=(v:unknown)=>createHash('sha256').update(typeof v==='string'||Buffer.isBuffer(v)?v:JSON.stringify(v)).digest('hex');
export const fileHash=async(p:string)=>hash(await readFile(p));
export const readJson=async(p:string)=>JSON.parse(await readFile(p,'utf8'));
export async function atomic(path:string,data:string|Buffer){await mkdir(dirname(path),{recursive:true});const tmp=`${path}.${process.pid}.tmp`;await writeFile(tmp,data);await rename(tmp,path);}
export const json=async(p:string,data:unknown)=>atomic(p,JSON.stringify(data,null,2)+'\n');
const exec=promisify(execFile);
export async function run(command:string,args:string[],options:{cwd?:string,timeout?:number}={}){
 try{return await exec(command,args,{maxBuffer:16*1024*1024,timeout:options.timeout??120000,...options});}
 catch(e){const err=e as Error & {stderr?:string};throw new Error(`${command} failed: ${(err.stderr||err.message).slice(-4000)}`);}
}
export async function probe(path:string){return JSON.parse((await run('ffprobe',['-v','error','-show_format','-show_streams','-of','json',path])).stdout);}
export const log=(s:string)=>process.stderr.write(s+'\n');
