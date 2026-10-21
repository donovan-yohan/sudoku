import type {Difficulty} from './types'
export interface Session {version:1;mode:'daily'|'practice';difficulty:Difficulty;dailyDate:string;practiceSeeds:Partial<Record<Difficulty,string>>}
const LEVELS:Difficulty[]=['beginner','intermediate','advanced','expert']
const KEY='sudoku-session-v1'
const fallback=(today:string):Session=>({version:1,mode:'daily',difficulty:'beginner',dailyDate:today,practiceSeeds:{}})
export function parseSession(text:string|null,today:string):Session{
 const fresh=fallback(today)
 if(!text||text.length>8192)return fresh
 try{
  const raw=JSON.parse(text)
  if(!raw||raw.version!==1||!['daily','practice'].includes(raw.mode)||!LEVELS.includes(raw.difficulty)||typeof raw.dailyDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(raw.dailyDate))return fresh
  const d=new Date(raw.dailyDate+'T00:00:00Z')
  if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==raw.dailyDate)return fresh
  const seeds:Session['practiceSeeds']={}
  if(!raw.practiceSeeds||typeof raw.practiceSeeds!=='object'||Array.isArray(raw.practiceSeeds))return fresh
  for(const level of LEVELS){
   const value=raw.practiceSeeds[level]
   if(value!==undefined){if(typeof value!=='string'||value.length<1||value.length>120)return fresh;seeds[level]=value}
  }
  if(raw.mode==='practice'&&!seeds[raw.difficulty as Difficulty])return fresh
  return {version:1,mode:raw.mode,difficulty:raw.difficulty,dailyDate:raw.dailyDate,practiceSeeds:seeds}
 }catch{return fresh}
}
export function loadSession(today:string):Session{try{return parseSession(localStorage.getItem(KEY),today)}catch{return fallback(today)}}
export function saveSession(s:Session):boolean{try{localStorage.setItem(KEY,JSON.stringify(s));return true}catch{return false}}
