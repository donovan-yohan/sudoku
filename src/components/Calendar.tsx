import {ARCHIVE_START,isArchiveDate,shiftArchiveDate} from '../archive'
import '../archive.css'

export default function Calendar({date,today,onChange}:{date:string;today:string;onChange:(date:string)=>void}){
 return <div className="archive-control" role="group" aria-label="Daily archive">
  <button type="button" aria-label="Previous day" title="Previous day" disabled={date<=ARCHIVE_START} onClick={()=>onChange(shiftArchiveDate(date,-1,today))}>‹</button>
  <input type="date" aria-label="Puzzle date" value={date} min={ARCHIVE_START} max={today} onChange={event=>{if(isArchiveDate(event.target.value,today))onChange(event.target.value)}} />
  <button type="button" aria-label="Next day" title="Next day" disabled={date>=today} onClick={()=>onChange(shiftArchiveDate(date,1,today))}>›</button>
  <time className="sr-only" dateTime={date}>{date}</time>
 </div>
}
