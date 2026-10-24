import {createElement,isValidElement,type AnchorHTMLAttributes,type MouseEvent} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {afterEach,describe,expect,it,vi} from 'vitest'
import Board, {type BoardProps} from './components/Board'
import CellReferences from './components/CellReferences'
import Walkthrough, {type WalkthroughScenario} from './components/Walkthrough'

function renderReferences(text:string,cellIdPrefix='lesson-:r1:'){
 return renderToStaticMarkup(createElement(CellReferences,{text,cellIdPrefix}))
}

function referenceAnchor(){
 const content=CellReferences({text:'r3c6',cellIdPrefix:'lesson-:r1:'})
 const anchor=content.props.children.find((child:unknown)=>isValidElement(child)&&child.type==='a')
 if(!isValidElement<AnchorHTMLAttributes<HTMLAnchorElement>>(anchor))throw new Error('Missing coordinate anchor')
 return anchor.props
}

afterEach(()=>vi.unstubAllGlobals())

function renderBoard(cellIdPrefix?:string){
 const props:BoardProps={
  values:Array(81).fill(0),givens:Array(81).fill(0),notes:Array.from({length:81},()=>[]),
  selected:0,onSelect:()=>{},label:'Lesson example',cellIdPrefix,
 }
 return renderToStaticMarkup(createElement(Board,props))
}

describe('Lesson coordinate targets',()=>{
 it('assigns each actual gridcell its scoped coordinate id',()=>{
  const html=renderBoard('lesson-:r1:')
  const cells=[...html.matchAll(/<button\b[^>]*role="gridcell"[^>]*>/g)].map(match=>match[0])
  expect(cells).toHaveLength(81)
  for(let cell=0;cell<81;cell++){
   expect(cells[cell]).toContain(`id="lesson-:r1:-r${Math.floor(cell/9)+1}c${cell%9+1}"`)
   expect(cells[cell]).toContain(`data-cell="${cell}"`)
  }
  expect(renderBoard()).not.toMatch(/<button\b[^>]*\bid=/)
 })

 it('links the final walkthrough result to the same scoped board without recording completion',()=>{
  const scenario:WalkthroughScenario={
   id:'finished',board:Array(81).fill(0),candidates:Array.from({length:81},()=>[]),steps:[],target:23,digit:4,
  }
  const onComplete=vi.fn()
  const props={title:'Finished example',scenario,onComplete,cellIdPrefix:'finished-example'}
  const html=renderToStaticMarkup(createElement(Walkthrough,props))
  expect(html).toContain('id="finished-example-r3c6"')
  expect(html).toContain('<a class="cell-reference" href="#finished-example-r3c6">r3c6</a> = 4')
  expect(onComplete).not.toHaveBeenCalled()
 })
})

describe('Lesson coordinate text',()=>{
 it('links repeated standalone references while preserving exact case, punctuation and escaped text',()=>{
  const text='See (r3c6), R3C6; r3c6/r9c9. <script>alert("x")</script> & end.'
  const html=renderReferences(text)
  expect(html).toBe('See (<a class="cell-reference" href="#lesson-:r1:-r3c6">r3c6</a>), <a class="cell-reference" href="#lesson-:r1:-r3c6">R3C6</a>; <a class="cell-reference" href="#lesson-:r1:-r3c6">r3c6</a>/<a class="cell-reference" href="#lesson-:r1:-r9c9">r9c9</a>. &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; end.')
  expect(renderReferences('')).toBe('')
  expect(renderReferences('No coordinates.')).toBe('No coordinates.')
 })

 it('leaves out-of-range, partial and embedded tokens unlinked',()=>{
  const text='r0c1 r1c0 r10c1 r1c10 r01c1 r1c01 r9c99 xr1c1 r1c1x _r1c1 r1c1_ R0C9 r1c1r2c2 ér1c1 r1c1é'
  expect(renderReferences(text)).toBe(text)
 })

 it('uses the same coordinate in distinct scopes without sharing targets',()=>{
  const first=renderReferences('r3c6','first')
  const second=renderReferences('r3c6','second')
  expect(first).toContain('href="#first-r3c6"')
  expect(second).toContain('href="#second-r3c6"')
  expect(first).not.toContain('second-r3c6')
  expect(second).not.toContain('first-r3c6')
 })
})

describe('Lesson coordinate activation',()=>{
 it('focuses and scrolls the exact gridcell without clicking it or navigating away',()=>{
  const cell={focus:vi.fn(),scrollIntoView:vi.fn(),click:vi.fn()}
  const getElementById=vi.fn(()=>cell)
  vi.stubGlobal('document',{getElementById})
  const preventDefault=vi.fn()
  const anchor=referenceAnchor()
  expect(anchor.onClick).toBeTypeOf('function')
  anchor.onClick!({button:0,defaultPrevented:false,preventDefault} as unknown as MouseEvent<HTMLAnchorElement>)
  expect(getElementById).toHaveBeenCalledExactlyOnceWith('lesson-:r1:-r3c6')
  expect(preventDefault).toHaveBeenCalledOnce()
  expect(cell.focus).toHaveBeenCalledExactlyOnceWith({preventScroll:true})
  expect(cell.scrollIntoView).toHaveBeenCalledExactlyOnceWith({block:'center',inline:'nearest',behavior:'instant'})
  expect(cell.click).not.toHaveBeenCalled()
  expect(anchor.onKeyDown).toBeUndefined()
 })

 it.each([{ctrlKey:true},{metaKey:true},{altKey:true},{shiftKey:true},{button:1},{defaultPrevented:true}])('preserves native modified activation: %j',modifiers=>{
  const getElementById=vi.fn()
  vi.stubGlobal('document',{getElementById})
  const preventDefault=vi.fn()
  const anchor=referenceAnchor()
  expect(anchor.onClick).toBeTypeOf('function')
  anchor.onClick!({button:0,defaultPrevented:false,preventDefault,...modifiers} as unknown as MouseEvent<HTMLAnchorElement>)
  expect(getElementById).not.toHaveBeenCalled()
  expect(preventDefault).not.toHaveBeenCalled()
 })

 it('leaves native navigation intact if its example target is no longer mounted',()=>{
  vi.stubGlobal('document',{getElementById:()=>null})
  const preventDefault=vi.fn()
  const anchor=referenceAnchor()
  expect(anchor.onClick).toBeTypeOf('function')
  anchor.onClick!({button:0,defaultPrevented:false,preventDefault} as unknown as MouseEvent<HTMLAnchorElement>)
  expect(preventDefault).not.toHaveBeenCalled()
 })
})
