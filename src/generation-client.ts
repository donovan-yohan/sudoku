import type {Puzzle} from './types'
import type {PuzzleRequest} from './generated-puzzles'

export function requestGeneratedPuzzle(request:PuzzleRequest,signal?:AbortSignal):Promise<Puzzle>{
 return new Promise((resolve,reject)=>{
  if(signal?.aborted){reject(new DOMException('Cancelled','AbortError'));return}
  const worker=new Worker(new URL('./generation.worker.ts',import.meta.url),{type:'module'})
  const clean=()=>{worker.terminate();signal?.removeEventListener('abort',abort)}
  const abort=()=>{clean();reject(new DOMException('Cancelled','AbortError'))}
  signal?.addEventListener('abort',abort,{once:true})
  worker.onmessage=event=>{
   clean()
   if(event.data.id!==request.id){reject(new Error('Puzzle response did not match the request'));return}
   if(event.data.error){reject(new Error(event.data.error));return}
   resolve(event.data.puzzle)
  }
  worker.onerror=()=>{clean();reject(new Error('Puzzle generation failed. Try again.'))}
  worker.postMessage(request)
 })
}
