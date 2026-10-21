import {describe,expect,it} from 'vitest'
import {CAGE_PATTERNS,cageOutlines} from './cage-outlines'
import type {Cage} from './variant-engine'
import {validateVariantRules} from './variant-engine'
import certifiedSeeds from './variant-seeds.json'

type Point=[number,number]
function loops(path:string):Point[][] {
 const parsed=[...path.matchAll(/M([^M]*?)Z/g)].map(match=>{
  const coordinates=match[1].match(/-?\d+/g)!.map(Number)
  return Array.from({length:coordinates.length/2},(_,i):Point=>[coordinates[2*i],coordinates[2*i+1]])
 })
 expect(parsed.map(points=>points.map(([x,y],i)=>`${i?'L':'M'}${x} ${y}`).join(' ')+' Z').join(' ')).toBe(path)
 return parsed
}
function signedArea(points:Point[]):number {
 return points.reduce((area,[x,y],i)=>{
  const [nx,ny]=points[(i+1)%points.length]
  return area+x*ny-y*nx
 },0)/2
}
function exposedEdges(cells:readonly number[]):string[] {
 const occupied=new Set(cells),edges:string[]=[]
 for(const cell of cells){
  const row=Math.floor(cell/9),col=cell%9,x=col*100,y=row*100
  if(row===0||!occupied.has(cell-9))edges.push(`${x},${y}>${x+100},${y}`)
  if(col===8||!occupied.has(cell+1))edges.push(`${x+100},${y}>${x+100},${y+100}`)
  if(row===8||!occupied.has(cell+9))edges.push(`${x+100},${y+100}>${x},${y+100}`)
  if(col===0||!occupied.has(cell-1))edges.push(`${x},${y+100}>${x},${y}`)
 }
 return edges.sort()
}
function assertCompleteInset(cells:readonly number[],path:string):void {
 // Independently recover the directed grid perimeter from the inset SVG.
 // Exact multiset equality catches omissions, duplicates and internal seams.
 const recovered:string[]=[]
 for(const points of loops(path))for(let i=0;i<points.length;i++){
  const [x,y]=points[i],[nx,ny]=points[(i+1)%points.length],[px,py]=points[(i+points.length-1)%points.length]
  expect((x===nx)!==(y===ny)).toBe(true)
  expect((x-px)*(ny-y)).not.toBe((y-py)*(nx-x))
  const sx=Math.sign(nx-x),sy=Math.sign(ny-y)
  const ax=Math.round(x/100)*100,ay=Math.round(y/100)*100,bx=Math.round(nx/100)*100,by=Math.round(ny/100)*100
  expect(Math.abs(sx?(y-ay):(x-ax))).toBe(6)
  expect(sx?y-ay:ax-x).toBe((sx||sy)*6)
  const length=(Math.abs(bx-ax)+Math.abs(by-ay))/100
  expect(length).toBeGreaterThan(0)
  for(let step=0;step<length;step++)recovered.push(`${ax+100*sx*step},${ay+100*sy*step}>${ax+100*sx*(step+1)},${ay+100*sy*(step+1)}`)
 }
 expect(recovered.sort()).toEqual(exposedEdges(cells))
}

describe('whole Killer cage outlines',()=>{
 it.each([
  ['L',[0,9,10],1],
  ['horizontal nine-cell run',[0,1,2,3,4,5,6,7,8],1],
  ['vertical nine-cell run',[0,9,18,27,36,45,54,63,72],1],
  ['enclosed hole',[0,1,2,9,11,18,19,20],2],
  ['two holes',[0,1,2,3,4,9,11,13,18,19,20,21,22],3],
  ['diagonal pinch',[0,1,2,9,11,18,19],1],
 ] as const)('retains every exposed edge of %s with square inset corners',(_name,cells,count)=>{
  const [outline]=cageOutlines([{cells,sum:1}])
  expect(loops(outline.path)).toHaveLength(count)
  assertCompleteInset(cells,outline.path)
 })
 it('expands a hole away from its excluded cell with opposite winding',()=>{
  const [outline]=cageOutlines([{cells:[0,1,2,9,11,18,19,20],sum:1}])
  const [outer,hole]=loops(outline.path)
  expect(signedArea(outer)).toBeGreaterThan(0)
  expect(signedArea(hole)).toBeLessThan(0)
  expect(hole).toEqual([[94,94],[94,206],[206,206],[206,94]])
 })
 it('never restarts paths or adds vertices at straight cell joins',()=>{
  expect(cageOutlines([{cells:[0,1,2,3,4,5,6,7,8],sum:45}])[0].path).toBe('M6 6 L894 6 L894 94 L6 94 Z')
  expect(cageOutlines([{cells:[0,9,10],sum:6}])[0].path).toBe('M6 6 L94 6 L94 106 L194 106 L194 194 L6 194 Z')
 })
 it.each([0,8,72,80])('keeps board corner cell %i inside the board',cell=>{
  const [outline]=cageOutlines([{cells:[cell],sum:1}])
  const [points]=loops(outline.path)
  expect(points).toHaveLength(4)
  expect(points.flat().every(coordinate=>coordinate>=6&&coordinate<=894)).toBe(true)
  assertCompleteInset([cell],outline.path)
 })
 it('is rotation-equivariant around the full board',()=>{
  let cells=[1,9,10,11]
  let points=loops(cageOutlines([{cells,sum:1}])[0].path)[0]
  const canonical=(polygon:Point[])=>polygon.map(([x,y],i)=>`${x},${y}>${polygon[(i+1)%polygon.length].join(',')}`).sort()
  for(let turn=0;turn<4;turn++){
   cells=cells.map(cell=>(cell%9)*9+8-Math.floor(cell/9))
   points=points.map(([x,y])=>[900-y,x])
   expect(canonical(loops(cageOutlines([{cells,sum:1}])[0].path)[0])).toEqual(canonical(points))
  }
 })
 it('covers all connected 3-by-3 polyominoes without missing or internal edges',()=>{
  for(let mask=1;mask<512;mask++){
   const cells=Array.from({length:9},(_,i)=>i).filter(i=>mask&(1<<i)).map(i=>Math.floor(i/3)*9+i%3)
   const reached=new Set([cells[0]])
   for(const cell of reached)for(const other of cells)if(Math.abs(cell-other)===9||(Math.floor(cell/9)===Math.floor(other/9)&&Math.abs(cell-other)===1))reached.add(other)
   if(reached.size!==cells.length)continue
   assertCompleteInset(cells,cageOutlines([{cells,sum:1}])[0].path)
  }
 })
 it('handles empty presentations and disconnected partial cages without looping',()=>{
  expect(cageOutlines([])).toEqual([])
  expect(cageOutlines([{cells:[],sum:0}])).toEqual([{cage:0,path:'',pattern:0}])
  const [outline]=cageOutlines([{cells:[0,10],sum:3}])
  expect(loops(outline.path)).toHaveLength(2)
  assertCompleteInset([0,10],outline.path)
 })
 it('fails promptly on non-cell coordinates rather than emitting invalid SVG',()=>{
  for(const cell of [-1,81,0.5,NaN,Infinity])expect(()=>cageOutlines([{cells:[cell],sum:1}])).toThrow(TypeError)
 })
 it('draws the complete concave T as one closed contour, not inset cell fragments',()=>{
  const [outline]=cageOutlines([{cells:[1,9,10,11],sum:16}])
  expect(outline.cage).toBe(0)
  expect(outline.path.match(/M/g)).toHaveLength(1)
  expect(outline.path.match(/Z/g)).toHaveLength(1)
  // Geometry uses 100 units per cell with a 6-unit interior inset.
  // The inner shoulders must reach x=106/194,y=106, and the base
  // must run all the way across x=6..294, without a gap at x=100/200.
  expect(outline.path).toContain('106 106')
  expect(outline.path).toContain('194 106')
  expect(outline.path).toContain('294 194')
  expect(outline.path).toContain('6 194')
 })
})

function assertProperPatterns(cages:readonly Cage[]):void {
 const outlines=cageOutlines(cages)
 expect(outlines).toHaveLength(cages.length)
 const owner=new Map<number,number>()
 cages.forEach((cage,i)=>cage.cells.forEach(cell=>owner.set(cell,i)))
 outlines.forEach((outline,i)=>{
  expect(outline.cage).toBe(i)
  expect(Number.isInteger(outline.pattern)&&outline.pattern>=0&&outline.pattern<CAGE_PATTERNS.length).toBe(true)
  assertCompleteInset(cages[i].cells,outline.path)
 })
 for(let row=0;row<9;row++)for(let col=0;col<9;col++){
  const cell=row*9+col,a=owner.get(cell)
  if(a===undefined)continue
  for(const neighbor of [col<8?cell+1:-1,row<8?cell+9:-1]){
   const b=owner.get(neighbor)
   if(b!==undefined&&a!==b)expect(outlines[a].pattern,`shared edge ${cell}/${neighbor}`).not.toBe(outlines[b].pattern)
  }
 }
}

function generatedPartition(seed:number):Cage[] {
 let state=seed
 const random=(limit:number)=>{
  state=(Math.imul(state,1664525)+1013904223)>>>0
  return state%limit
 }
 const solution=certifiedSeeds[0].solution
 const cages:Cage[]=solution.map((sum,cell)=>({cells:[cell],sum}))
 for(let step=0;step<300;step++){
  const cell=random(81),neighbors=[cell%9<8?cell+1:-1,cell<72?cell+9:-1].filter(other=>other>=0)
  if(!neighbors.length)continue
  const neighbor=neighbors[random(neighbors.length)]
  const a=cages.findIndex(cage=>cage.cells.includes(cell)),b=cages.findIndex(cage=>cage.cells.includes(neighbor))
  if(a===b)continue
  const cells=[...cages[a].cells,...cages[b].cells]
  if(cells.length>9||new Set(cells.map(cell=>solution[cell])).size!==cells.length)continue
  cages[a]={cells,sum:cages[a].sum+cages[b].sum}
  cages.splice(b,1)
 }
 return cages
}

describe('Killer cage boundary patterns',()=>{
 it('colors triangular contacts and a cage with eighteen neighbors',()=>{
  assertProperPatterns([{cells:[0,1],sum:3},{cells:[9],sum:3},{cells:[10],sum:4}])
  const cages=[{cells:Array.from({length:9},(_,col)=>36+col),sum:45},...Array.from({length:81},(_,cell)=>cell).filter(cell=>cell<36||cell>44).map(cell=>({cells:[cell],sum:1}))]
  assertProperPatterns(cages)
 })
 it.each(certifiedSeeds.filter(seed=>seed.variant==='killer'))('covers the complete certified partition $id',seed=>{
  const cages=seed.cages!
  validateVariantRules({variant:'killer',cages})
  expect(cages.flatMap(cage=>cage.cells).sort((a,b)=>a-b)).toEqual(Array.from({length:81},(_,cell)=>cell))
  assertProperPatterns(cages)
  const before=cageOutlines(cages)
  const after=cageOutlines([...cages].reverse().map(cage=>({...cage,cells:[...cage.cells].reverse()})))
  expect(after.map(({path,pattern})=>({path,pattern})).reverse()).toEqual(before.map(({path,pattern})=>({path,pattern})))
 })
 it('covers a deterministic sweep of 128 connected full-board partitions',()=>{
  for(let seed=1;seed<=128;seed++){
   const cages=generatedPartition(seed)
   validateVariantRules({variant:'killer',cages})
   expect(cages.flatMap(cage=>cage.cells).sort((a,b)=>a-b)).toEqual(Array.from({length:81},(_,cell)=>cell))
   assertProperPatterns(cages)
  }
 })
 it('does not mutate frozen cages, cells, sums or caller ordering',()=>{
  const cages=Object.freeze(generatedPartition(42).map(cage=>Object.freeze({sum:cage.sum,cells:Object.freeze([...cage.cells])})))
  const before=JSON.stringify(cages)
  const first=cageOutlines(cages)
  expect(cageOutlines(cages)).toEqual(first)
  expect(JSON.stringify(cages)).toBe(before)
  expect(cageOutlines(cages.map(cage=>({...cage,sum:999})))).toEqual(first)
 })
 it('uses six distinct renderer-authored dash arrays',()=>{
  expect(CAGE_PATTERNS).toEqual(['1 3','3 3','6 3','9 3','6 2 1 2','9 2 1 2 1 2'])
 })
 it('assigns different patterns at every shared edge, not diagonal contacts',()=>{
  const cages:readonly Cage[]=[{cells:[0],sum:1},{cells:[1],sum:2},{cells:[10],sum:3}]
  const result=cageOutlines(cages)
  expect(result[0].pattern).not.toBe(result[1].pattern)
  expect(result[1].pattern).not.toBe(result[2].pattern)
  expect(result[0].pattern).toBe(result[2].pattern)
  expect(cageOutlines([{cells:[8],sum:1},{cells:[9],sum:2}]).map(o=>o.pattern)).toEqual([0,0])
 })
 it('preserves cage indexes but keeps geometry and patterns stable across cell/cage reorderings',()=>{
  const cages:readonly Cage[]=[{cells:[0,9],sum:3},{cells:[1,2],sum:5},{cells:[10,11],sum:7}]
  const before=cageOutlines(cages)
  const after=cageOutlines([...cages].reverse().map(cage=>({...cage,cells:[...cage.cells].reverse()})))
  expect(before.map(o=>o.cage)).toEqual([0,1,2])
  expect(after.map(o=>o.cage)).toEqual([0,1,2])
  expect(after.map(({path,pattern})=>({path,pattern})).reverse()).toEqual(before.map(({path,pattern})=>({path,pattern})))
 })
})
