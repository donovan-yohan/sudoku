import {useMemo} from 'react'
import {CAGE_PATTERNS,cageOutlines} from '../cage-outlines'
import type {Cage} from '../variant-engine'

type CageOutlinesProps = { cages: readonly Cage[]; selected?: number }

export default function CageOutlines({cages,selected}:CageOutlinesProps){
 const outlines=useMemo(()=>cageOutlines(cages),[cages])
 const selectedCage=cages.findIndex(cage=>selected!==undefined&&cage.cells.includes(selected))
 return <svg className="cage-outlines" viewBox="0 0 900 900" preserveAspectRatio="none" aria-hidden="true" focusable="false">
  {outlines.map(outline=><path key={outline.cage} className={outline.cage===selectedCage?'selected-cage':undefined} data-cage={outline.cage} data-pattern={outline.pattern} d={outline.path} fill="none" strokeWidth="1" vectorEffect="non-scaling-stroke" strokeDasharray={CAGE_PATTERNS[outline.pattern]} />)}
 </svg>
}
