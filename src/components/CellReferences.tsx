import type {MouseEvent,ReactNode} from 'react'

function focusCell(event:MouseEvent<HTMLAnchorElement>,id:string){
 if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.altKey||event.shiftKey)return
 const cell=document.getElementById(id)
 if(!cell)return
 event.preventDefault()
 cell.focus({preventScroll:true})
 cell.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'})
}

export default function CellReferences({text,cellIdPrefix}:{text:string;cellIdPrefix:string}){
 const parts:ReactNode[]=[]
 let end=0
 for(const match of text.matchAll(/(?<![\p{L}\p{N}_])r[1-9]c[1-9](?![\p{L}\p{N}_])/giu)){
  const start=match.index
  parts.push(text.slice(end,start))
  const id=`${cellIdPrefix}-${match[0].toLowerCase()}`
  parts.push(<a className="cell-reference" href={`#${id}`} key={start} onClick={event=>focusCell(event,id)}>{match[0]}</a>)
  end=start+match[0].length
 }
 parts.push(text.slice(end))
 return <>{parts}</>
}
