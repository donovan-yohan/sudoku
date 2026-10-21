import {generateRequestedPuzzle,type PuzzleRequest} from './generated-puzzles'

self.onmessage=(event:MessageEvent<PuzzleRequest>)=>{
 const request=event.data
 try{self.postMessage({id:request.id,puzzle:generateRequestedPuzzle(request)})}
 catch(error){self.postMessage({id:request.id,error:error instanceof Error?error.message:'Puzzle generation failed. Try again.'})}
}
