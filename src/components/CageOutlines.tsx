import {useMemo} from 'react'
import {CAGE_PATTERNS,cageOutlines} from '../cage-outlines'
import type {Cage} from '../variant-engine'

export default function CageOutlines({cages}:{cages:readonly Cage[]}){
 const outlines=useMemo(()=>cageOutlines(cages),[cages])
 return <svg className="cage-outlines" viewBox="0 0 900 900" preserveAspectRatio="none" aria-hidden="true" focusable="false">
  {outlines.map(outline=><path key={outline.cage} data-cage={outline.cage} data-pattern={outline.pattern} d={outline.path} fill="none" strokeWidth="1" vectorEffect="non-scaling-stroke" strokeDasharray={CAGE_PATTERNS[outline.pattern]} />)}
 </svg>
}
