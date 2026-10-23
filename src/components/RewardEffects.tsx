import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import { rewardStyle } from '../reward'
interface Props {units:number[];count:number;complete:boolean;serial:number;onComplete?:()=>void}
export default function RewardEffects({units,count,complete,serial,onComplete}:Props){
  const layer = useRef<HTMLDivElement>(null)
  const completeCallback = useRef(onComplete)
  useLayoutEffect(() => { completeCallback.current = onComplete })
  useLayoutEffect(() => {
    if (!complete || !serial || !layer.current) return
    let active = true
    // Observe the mounted finale, including staggered descendants and pseudo-elements.
    // Cancellation (for example reduced motion becoming active) also settles finished.
    const animations = layer.current.getAnimations({ subtree: true })
    void Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
      if (active) completeCallback.current?.()
    })
    return () => { active = false }
  }, [complete, serial])
  if(!serial||!units.length)return null
  const effect=rewardStyle(count,complete)
  const cells=new Set<number>()
  units.forEach(u=>Array.from({length:9},(_,n)=>u<9?u*9+n:u<18?n*9+u-9:Math.floor((u-18)/3)*27+((u-18)%3)*3+Math.floor(n/3)*9+n%3).forEach(c=>cells.add(c)))
  if(complete)Array.from({length:81},(_,i)=>cells.add(i))
  return <div key={serial} ref={layer} aria-hidden="true" className={`reward-layer reward-${effect.variant}${effect.chromatic?' chromatic':''}`} data-reward-variant={effect.variant} data-reward-count={count} style={{'--effect-duration':`${effect.duration}ms`,'--effect-intensity':effect.intensity} as CSSProperties}>
    {[...cells].map(cell=><i key={cell} className="reward-cell" style={{'--cell':cell,'--r':Math.floor(cell/9),'--c':cell%9,'--delay':`${(Math.floor(cell/9)+cell%9)*35}ms`,'--hue':`${(cell*17+count*23)%360}deg`,gridRow:Math.floor(cell/9)+1,gridColumn:cell%9+1} as CSSProperties}/>)}
    {units.map(u=><i key={`u${u}`} className={`reward-unit unit-${u<9?'row':u<18?'column':'box'}`} style={{gridRow:u<9?`${u+1}/span 1`:u<18?'1/span 9':`${Math.floor((u-18)/3)*3+1}/span 3`,gridColumn:u<9?'1/span 9':u<18?`${u-8}/span 1`:`${((u-18)%3)*3+1}/span 3`}}/>)}
    {complete&&<i className="finale-ring"/>}
  </div>
}
