import type {Difficulty,Puzzle} from './types'
import type {GameVariant} from './variant-engine'
import {generateVariant} from './variant-generator'
import {ARCHIVE_START} from './archive'

export interface PuzzleRequest {id:string;seed:string;variant:GameVariant;difficulty:Difficulty}
const levels=['beginner','intermediate','advanced','expert']
function request(mode:'daily'|'practice',seed:string,variant:GameVariant,difficulty:Difficulty):PuzzleRequest{
 if(!['classic','x','killer'].includes(variant)||!levels.includes(difficulty))throw new TypeError('Unknown puzzle selection')
 if(typeof seed!=='string'||seed.length<1||seed.length>120)throw new TypeError('Invalid puzzle seed')
 const id=`v2:${mode}:${seed}:${variant}:${difficulty}`
 return {id,seed:id,variant,difficulty}
}
export function generatedDailyRequest(date:string,variant:GameVariant,difficulty:Difficulty):PuzzleRequest{
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||date<ARCHIVE_START)throw new TypeError('Invalid archive date')
 const parsed=new Date(`${date}T00:00:00Z`)
 if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==date)throw new TypeError('Invalid UTC date')
 return request('daily',date,variant,difficulty)
}
export function generatedPracticeRequest(seed:string,variant:GameVariant,difficulty:Difficulty):PuzzleRequest{return request('practice',seed,variant,difficulty)}
export function generateRequestedPuzzle(request:PuzzleRequest):Puzzle{
 const generated=generateVariant(request.seed,request.variant,request.difficulty)
 return {id:request.id,givens:[...generated.givens],solution:[...generated.solution],difficulty:generated.difficulty,variant:generated.variant,generatorVersion:generated.generatorVersion,techniques:[...generated.techniques],...(generated.cages?{cages:generated.cages.map(cage=>({sum:cage.sum,cells:[...cage.cells]}))}:{})}
}
