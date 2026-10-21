import { readFileSync } from 'node:fs'
import { chromium, type Browser } from '@playwright/test'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const stylesheet=new URL('./digit-rewards.css',import.meta.url)
let browser:Browser
beforeAll(async()=>{browser=await chromium.launch()},15000)
afterAll(async()=>{await browser?.close()})

async function fixture(reducedMotion:'reduce'|'no-preference'='no-preference') {
 const page=await browser.newPage({reducedMotion})
 await page.setContent(`<style>body{color:#111;background:#fff}.cell-value{font-size:32px}</style><div>${Array.from({length:9},(_,order)=>`<span class="cell-value digit-celebrate" style="--digit-order:${order}">1</span>`).join('')}</div>`)
 await page.addStyleTag({content:readFileSync(stylesheet,'utf8')})
 await page.locator('.digit-celebrate').evaluateAll(spans=>{
  for(const span of spans)for(const animation of span.getAnimations({subtree:true}))animation.pause()
 })
 return page
}

describe('digit completion choreography',()=>{
 it('hops all nine actual digits with ordered delays and a transient hairline shimmer',async()=>{
  const page=await fixture()
  try{
   const frames=await page.locator('.digit-celebrate').evaluateAll(spans=>spans.map(span=>{
    const style=getComputedStyle(span)
    for(const animation of span.getAnimations({subtree:true}))animation.currentTime=Number.parseFloat(style.animationDelay)*1000+160
    const shimmer=getComputedStyle(span,'::after')
    return {name:style.animationName,delay:Number.parseFloat(style.animationDelay),duration:Number.parseFloat(style.animationDuration),iterations:style.animationIterationCount,offset:new DOMMatrix(getComputedStyle(span).transform).m42,shimmer:shimmer.animationName,shimmerOpacity:Number.parseFloat(shimmer.opacity),shimmerDelay:Number.parseFloat(shimmer.animationDelay),width:shimmer.width,pointerEvents:shimmer.pointerEvents}
   }))
   expect(frames).toHaveLength(9)
   frames.forEach((frame,order)=>{
    expect(frame.name).toBe('digit-celebrate-hop')
    expect(frame.delay).toBeCloseTo(order*.034)
    expect(frame.duration).toBe(.44)
    expect(frame.iterations).toBe('1')
    expect(frame.offset).toBeLessThan(0)
    expect(frame.offset).toBeGreaterThan(-4)
    expect(frame.shimmer).toBe('digit-celebrate-shimmer')
    expect(frame.shimmerOpacity).toBeGreaterThan(0)
    expect(frame.shimmerDelay).toBeCloseTo(frame.delay)
    expect(frame.width).toBe('1px')
    expect(frame.pointerEvents).toBe('none')
   })
  }finally{await page.close()}
 })
 it('suppresses both hop and shimmer for reduced motion without hiding digits',async()=>{
  const page=await fixture('reduce')
  try{
   const styles=await page.locator('.digit-celebrate').evaluateAll(spans=>spans.map(span=>({animation:getComputedStyle(span).animationName,transform:getComputedStyle(span).transform,opacity:getComputedStyle(span).opacity,shimmer:getComputedStyle(span,'::after').animationName,shimmerOpacity:getComputedStyle(span,'::after').opacity})))
   for(const style of styles){
    expect(style.animation).toBe('none')
    expect(style.transform).toBe('none')
    expect(style.opacity).toBe('1')
    expect(style.shimmer).toBe('none')
    expect(style.shimmerOpacity).toBe('0')
   }
  }finally{await page.close()}
 })
 it('returns to an unmoved monochrome digit in both themes when the finite effect ends',async()=>{
  const page=await fixture()
  try{
   for(const color of ['rgb(17, 17, 17)','rgb(238, 238, 238)']){
    const settled=await page.locator('.digit-celebrate').evaluateAll((spans,color)=>{
     document.body.style.color=color
     for(const span of spans)for(const animation of span.getAnimations({subtree:true}))animation.finish()
     return spans.map(span=>({color:getComputedStyle(span).color,offset:new DOMMatrix(getComputedStyle(span).transform).m42,shimmerOpacity:getComputedStyle(span,'::after').opacity}))
    },color)
    for(const digit of settled){
     expect(digit.color).toBe(color)
     expect(digit.offset).toBe(0)
     expect(digit.shimmerOpacity).toBe('0')
    }
   }
  }finally{await page.close()}
 })
})
