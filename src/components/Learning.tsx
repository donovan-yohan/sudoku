import {useState} from 'react'
import {PRACTICAL_LESSONS} from '../practical-lessons'
import {PRACTICAL_VARIANT_LESSONS} from '../practical-variant-lessons'
import Walkthrough,{type WalkthroughScenario} from './Walkthrough'
import type {Difficulty} from '../types'

const PROGRESS_KEY='sudoku-lessons-v1'
const tiers:Difficulty[]=['beginner','intermediate','advanced','expert']
const tierNames:Record<Difficulty,string>={beginner:'Foundations',intermediate:'Intermediate',advanced:'Advanced',expert:'Expert'}
type LessonType='classic'|'x'|'killer'
interface WalkthroughLesson {id:string;title:string;tier:Difficulty;rule:string;scenarios:WalkthroughScenario[]}
const lessons:WalkthroughLesson[]=[...PRACTICAL_LESSONS,...PRACTICAL_VARIANT_LESSONS]

export function parseLessonProgress(text:string|null):string[]{
 if(!text||text.length>16384)return []
 try{
  const data:unknown=JSON.parse(text)
  if(!data||typeof data!=='object')return []
  const {version,passed}=data as {version?:unknown;passed?:unknown}
  if(version!==1||!Array.isArray(passed)||passed.length>128||!passed.every(value=>typeof value==='string'))return []
  const known=new Set(lessons.flatMap(lesson=>lesson.scenarios.map(scenario=>scenario.id)))
  return [...new Set<string>(passed)].filter(id=>known.has(id))
 }catch{return []}
}
function readProgress(){
 if(typeof window==='undefined')return {passed:[] as string[],warning:''}
 try{return {passed:parseLessonProgress(localStorage.getItem(PROGRESS_KEY)),warning:''}}
 catch{return {passed:[] as string[],warning:'Lesson progress could not be saved.'}}
}

export default function Learning({onReturn}:{onReturn:()=>void}){
 const [initial]=useState(readProgress)
 const [passed,setPassed]=useState(initial.passed)
 const [warning,setWarning]=useState(initial.warning)
 const [active,setActive]=useState<WalkthroughLesson|null>(null)
 const [lessonType,setLessonType]=useState<LessonType>('classic')
 const [example,setExample]=useState(0)
 function record(scenario:WalkthroughScenario){
  const next=[...new Set([...passed,scenario.id])]
  setPassed(next)
  try{localStorage.setItem(PROGRESS_KEY,JSON.stringify({version:1,passed:next}))}
  catch{setWarning('Lesson progress could not be saved.')}
 }
 return <section className="learning-section" aria-label="Interactive lessons">
  <div className="learn-heading"><h1>Lessons</h1><button type="button" className="text-link" onClick={onReturn}>Return to puzzle <span aria-hidden="true">↗</span></button></div>
  {warning&&<p className="notice" role="status">{warning}</p>}
  <div className="lesson-type" role="group" aria-label="Lesson type">{(['classic','x','killer'] as const).map(type=><button type="button" key={type} aria-pressed={lessonType===type} onClick={()=>{setLessonType(type);setActive(null);setExample(0)}}>{type==='classic'?'General':type==='x'?'X Sudoku':'Killer Sudoku'}</button>)}</div>
  {active?<>
   <button type="button" className="back-link" onClick={()=>setActive(null)}>← All lessons</button>
   <article className="active-lesson">
    <div className="walkthrough-heading"><h2>{active.title}</h2><p>{active.rule}</p></div>
    <div className="walkthrough-examples" role="group" aria-label="Examples">{active.scenarios.map((scenario,index)=><button type="button" key={scenario.id} aria-pressed={example===index} onClick={()=>setExample(index)}>Example {index+1}</button>)}</div>
    <Walkthrough key={active.scenarios[example].id} title={`${active.title} example ${example+1}`} scenario={active.scenarios[example]} onComplete={()=>record(active.scenarios[example])} />
   </article>
  </>:<div className="lesson-catalog">{tiers.map(tier=>{
   const catalog=lessons.filter(lesson=>lesson.tier===tier&&(lesson.scenarios[0].variant??'classic')===lessonType)
   if(!catalog.length)return null
   return <section className="lesson-tier" key={tier}><h2>{tierNames[tier]}</h2><ol className="lesson-list">{catalog.map(lesson=>{
    const count=lesson.scenarios.filter(scenario=>passed.includes(scenario.id)).length
    return <li className="lesson-item" key={lesson.id}><button type="button" className="lesson-link" onClick={()=>{setActive(lesson);setExample(0)}}><span className="lesson-number" aria-hidden="true">{String(catalog.indexOf(lesson)+1).padStart(2,'0')}</span><span className="lesson-description"><strong>{lesson.title}</strong></span><span className="lesson-status">{count===lesson.scenarios.length?'Completed':count?'In progress':'Not started'} <span aria-hidden="true">↗</span></span></button></li>
   })}</ol></section>
  })}</div>}
 </section>
}
