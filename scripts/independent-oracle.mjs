// Standalone set-based solver. No application engine imports.
export function enumerate(board, domains = null, limit = 2) {
 if(!Array.isArray(board)||board.length!==81||board.some(n=>!Number.isInteger(n)||n<0||n>9))return {count:0,first:null}
 const values=board.slice(), groups=[]
 for(let n=0;n<9;n++){
  groups.push(Array.from({length:9},(_,i)=>n*9+i))
  groups.push(Array.from({length:9},(_,i)=>i*9+n))
  groups.push(Array.from({length:9},(_,i)=>Math.floor(n/3)*27+(n%3)*3+Math.floor(i/3)*9+i%3))
 }
 for(const group of groups){const ns=group.map(c=>values[c]).filter(Boolean);if(new Set(ns).size!==ns.length)return {count:0,first:null}}
 const neighbors=Array.from({length:81},(_,c)=>[...new Set(groups.filter(g=>g.includes(c)).flat())].filter(x=>x!==c))
 let count=0,first=null,nodes=0
 function visit(){
  if(count>=limit)return
  if(++nodes>2000000)throw Error('Independent oracle search budget exhausted')
  const options=Array.from({length:81},(_,cell)=>values[cell]?[]:(domains?domains[cell]:[1,2,3,4,5,6,7,8,9]).filter(d=>!neighbors[cell].some(p=>values[p]===d)))
  let target=-1,choices=[]
  for(let cell=0;cell<81;cell++){
   if(values[cell])continue
   const possible=options[cell]
   if(!possible.length)return
   if(target<0||possible.length<choices.length){target=cell;choices=possible}
  }
  for(const group of groups)for(let digit=1;digit<=9;digit++){
   if(group.some(c=>values[c]===digit))continue
   const places=group.filter(c=>options[c].includes(digit))
   if(!places.length)return
   if(places.length===1){target=places[0];choices=[digit]}
  }
  if(target<0){count++;first??=values.slice();return}
  for(const digit of choices){values[target]=digit;visit();values[target]=0;if(count>=limit)return}
 }
 visit();return {count,first,nodes}
}
