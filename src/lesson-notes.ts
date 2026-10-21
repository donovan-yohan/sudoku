import type {Scenario} from './types'

// Display annotations are a projection, never the domains used by validation.
export function lessonNotes(technique:string,scenario:Scenario):number[][]{
 const relevant=new Set([...scenario.evidence,scenario.target])
 const singleDigit=['locked-candidates','x-wing','swordfish'].includes(technique)
 return scenario.candidates.map((notes,cell)=>{
  if(!relevant.has(cell))return []
  if(singleDigit)return notes.filter(digit=>digit===scenario.digit)
  if(cell===scenario.target&&scenario.kind==='eliminate'){
   const support=new Set(scenario.evidence.flatMap(cell=>scenario.candidates[cell]))
   return notes.filter(digit=>support.has(digit)||digit===scenario.digit)
  }
  return [...notes]
 })
}
