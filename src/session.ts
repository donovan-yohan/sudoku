import type {Difficulty} from './types'
import {isArchiveDate} from './archive'
export interface Session {version:1;mode:'daily'|'practice';difficulty:Difficulty;dailyDate:string;practiceSeeds:Partial<Record<Difficulty,string>>;variant?:'classic'|'x'|'killer';variantPracticeSeeds?:Partial<Record<'x'|'killer',Partial<Record<Difficulty,string>>>>;generator?:'v2'}
const LEVELS:Difficulty[]=['beginner','intermediate','advanced','expert']
const KEY='sudoku-session-v1'
const fallback=(today:string):Session=>({version:1,mode:'daily',difficulty:'beginner',dailyDate:today,practiceSeeds:{}})
export function parseSession(text:string|null,today:string):Session{
 const fresh=fallback(today)
 if(!text||text.length>8192)return fresh
 try{
  const raw=JSON.parse(text)
  if(!raw||raw.version!==1||!['daily','practice'].includes(raw.mode)||!LEVELS.includes(raw.difficulty)||typeof raw.dailyDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(raw.dailyDate))return fresh
  if(!isArchiveDate(raw.dailyDate,today))return fresh
  if(raw.variant!==undefined&&!['classic','x','killer'].includes(raw.variant))return fresh
  if(raw.generator!==undefined&&raw.generator!=='v2')return fresh
  const seeds:Session['practiceSeeds']={}
  if(!raw.practiceSeeds||typeof raw.practiceSeeds!=='object'||Array.isArray(raw.practiceSeeds))return fresh
  for(const level of LEVELS){
   const value=raw.practiceSeeds[level]
   if(value!==undefined){if(typeof value!=='string'||value.length<1||value.length>120)return fresh;seeds[level]=value}
  }
  const variantSeeds:NonNullable<Session['variantPracticeSeeds']>={}
  if(raw.variantPracticeSeeds!==undefined){
   if(!raw.variantPracticeSeeds||typeof raw.variantPracticeSeeds!=='object'||Array.isArray(raw.variantPracticeSeeds))return fresh
   for(const variant of Object.keys(raw.variantPracticeSeeds)){
    if(variant!=='x'&&variant!=='killer')return fresh
    const source=raw.variantPracticeSeeds[variant]
    if(!source||typeof source!=='object'||Array.isArray(source))return fresh
    const target:Session['practiceSeeds']={}
    for(const level of Object.keys(source)){
     const value=source[level]
     if(!LEVELS.includes(level as Difficulty)||typeof value!=='string'||value.length<1||value.length>120)return fresh
     target[level as Difficulty]=value
    }
    variantSeeds[variant]=target
   }
  }
  const activeSeeds=raw.variant==='x'?variantSeeds.x:raw.variant==='killer'?variantSeeds.killer:seeds
  if(raw.mode==='practice'&&!activeSeeds?.[raw.difficulty as Difficulty])return fresh
  const session:Session={version:1,mode:raw.mode,difficulty:raw.difficulty,dailyDate:raw.dailyDate,practiceSeeds:seeds}
  if(raw.variant!==undefined)session.variant=raw.variant
  if(raw.variantPracticeSeeds!==undefined)session.variantPracticeSeeds=variantSeeds
  if(raw.generator!==undefined)session.generator=raw.generator
  return session
 }catch{return fresh}
}
export function loadSession(today:string):Session{try{return parseSession(localStorage.getItem(KEY),today)}catch{return fallback(today)}}
export function saveSession(s:Session):boolean{try{localStorage.setItem(KEY,JSON.stringify(s));return true}catch{return false}}
