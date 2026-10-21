export interface RewardStyle { variant: 'trace'|'wave'|'orbit'|'scatter'|'scan'|'finale'; chromatic: boolean; duration: number; intensity: number }
const variants=['trace','wave','orbit','scatter','scan'] as const
export function rewardStyle(count:number,complete:boolean):RewardStyle {
  const n=Math.max(0,Math.min(27,Number.isFinite(count)?count:0))
  return {variant:complete?'finale':variants[Math.max(0,n-1)%variants.length],chromatic:complete||n>=7,duration:complete?2400:650+n*25,intensity:complete?1:0.16+n/40}
}
