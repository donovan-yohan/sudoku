export const ARCHIVE_START='2026-01-01'
const realDate=(date:string)=>typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(`${date}T00:00:00Z`))&&new Date(`${date}T00:00:00Z`).toISOString().slice(0,10)===date
export function isArchiveDate(date:string,today:string):boolean{return realDate(date)&&date>=ARCHIVE_START&&date<=today}
export function shiftArchiveDate(date:string,direction:-1|1,today:string):string{
 if(!isArchiveDate(date,today))return today
 const shifted=new Date(Date.parse(`${date}T00:00:00Z`)+direction*86400000).toISOString().slice(0,10)
 return shifted<ARCHIVE_START?ARCHIVE_START:shifted>today?today:shifted
}
