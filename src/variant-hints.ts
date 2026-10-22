import {nextVariantDeduction,solveVariant,VariantBudgetError,type Rules,type VariantDeduction} from './variant-engine'
import {LogicalBudgetError} from './solver-policy'

export interface VariantHintResult {deduction:VariantDeduction|null;logical:number[][];message:string}
/** Logical domains are internal proof state. Player pencil marks are never supplied. */
export function requestVariantHint(values:number[],rules:Rules,previous?:number[][]):VariantHintResult{
 const logical=previous?.map(list=>[...list])??values.map(value=>value?[]:[1,2,3,4,5,6,7,8,9])
 try{
  const result=solveVariant(values,rules,{maxNodes:5000,maxWork:1000000})
  if(!result.first)return {deduction:null,logical,message:result.exhausted?'No hint available for this position.':'Check the conflicting entries first.'}
  const deduction=nextVariantDeduction(values,rules,logical)
  return {deduction,logical,message:deduction?'':'No hint available for this position.'}
 }catch(error){
  if(error instanceof VariantBudgetError||error instanceof LogicalBudgetError)return {deduction:null,logical,message:'No hint available for this position.'}
  if(error instanceof TypeError)return {deduction:null,logical,message:'Check the conflicting entries first.'}
  throw error
 }
}
