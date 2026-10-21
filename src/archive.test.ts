import {describe,expect,it} from 'vitest'
import {ARCHIVE_START,isArchiveDate,shiftArchiveDate} from './archive'

describe('UTC daily archive',()=>{
 it('starts on 2026-01-01 and allows only real dates through today',()=>{
  expect(ARCHIVE_START).toBe('2026-01-01')
  for(const date of ['2026-01-01','2026-10-21'])expect(isArchiveDate(date,'2026-10-21')).toBe(true)
  for(const date of ['2025-12-31','2026-10-22','2026-02-29','2026-02-30','2026-1-01','not-a-date'])expect(isArchiveDate(date,'2026-10-21')).toBe(false)
 })
 it('moves days in UTC across months, leap days and years without escaping bounds',()=>{
  expect(shiftArchiveDate('2026-01-01',-1,'2026-10-21')).toBe('2026-01-01')
  expect(shiftArchiveDate('2026-10-21',1,'2026-10-21')).toBe('2026-10-21')
  expect(shiftArchiveDate('2026-03-01',-1,'2026-10-21')).toBe('2026-02-28')
  expect(shiftArchiveDate('2028-03-01',-1,'2028-03-01')).toBe('2028-02-29')
  expect(shiftArchiveDate('2027-01-01',-1,'2027-01-01')).toBe('2026-12-31')
  expect(shiftArchiveDate('broken',1,'2026-10-21')).toBe('2026-10-21')
 })
})
