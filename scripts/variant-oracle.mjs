// Independent grouped exact-cover oracle. No production engine imports.
// Each option covers all assignments of one cage, rather than cell-by-cell MRV.
export function oracle(board, rules, { limit = 2, maxNodes = 300_000, maxWork = 10_000_000 } = {}) {
  if (!Number.isSafeInteger(limit) || limit < 1 || !Number.isSafeInteger(maxNodes) || maxNodes < 0 || !Number.isSafeInteger(maxWork) || maxWork < 0) throw new TypeError('Invalid oracle budget')
  let count = 0, nodes = 0, work = 0, exhausted = false, first = null
  const result = () => ({ count, nodes, work, exhausted, first, unique: !exhausted && count === 1 && count < limit })
  const spend = () => { if (++work > maxWork) { exhausted = true; throw new Error('oracle-budget') } }
  if (!Array.isArray(board) || board.length !== 81 || Array.from(board).some(d => !Number.isInteger(d) || d < 0 || d > 9)) return result()
  const variant = rules.variant
  if (!['classic', 'x', 'killer'].includes(variant)) throw new TypeError('Unknown oracle variant')
  if (variant !== 'killer' && rules.cages !== undefined) return result()
  const groups = variant === 'killer' ? rules.cages : board.map((_, c) => ({ cells: [c], sum: null }))
  if (!Array.isArray(groups) || !groups.length) return result()
  const coveredCells = new Set()
  for (const g of groups) {
    if (!Array.isArray(g.cells) || !g.cells.length || g.cells.length > 9 || (variant === 'killer' && (!Number.isInteger(g.sum) || g.sum < g.cells.length * (g.cells.length + 1) / 2 || g.sum > g.cells.length * (19 - g.cells.length) / 2))) return result()
    for (const c of g.cells) {
      if (!Number.isInteger(c) || c < 0 || c >= 81 || coveredCells.has(c)) return result()
      coveredCells.add(c)
    }
    const reached = new Set([g.cells[0]])
    for (const c of reached) for (const n of g.cells) if (Math.abs(Math.floor(c / 9) - Math.floor(n / 9)) + Math.abs(c % 9 - n % 9) === 1) reached.add(n)
    if (reached.size !== g.cells.length) return result()
  }
  if (coveredCells.size !== 81) return result()
  const diagonalColumns = variant === 'x' ? 18 : 0, groupOffset = 324 + diagonalColumns
  const rows = [], columns = Array.from({ length: groupOffset + groups.length }, () => [])
  try {
    for (let g = 0; g < groups.length; g++) {
      const cage = groups[g], assignment = [], usedDigits = new Set()
      function tuples(i, left) {
        spend()
        if (i === cage.cells.length) {
          if (cage.sum !== null && left !== 0) return
          const cols = [groupOffset + g]
          for (let j = 0; j < cage.cells.length; j++) {
            const c = cage.cells[j], d = assignment[j] - 1, r = Math.floor(c / 9), k = c % 9, b = Math.floor(r / 3) * 3 + Math.floor(k / 3)
            cols.push(c, 81 + r * 9 + d, 162 + k * 9 + d, 243 + b * 9 + d)
            if (variant === 'x') { if (r === k) cols.push(324 + d); if (r + k === 8) cols.push(333 + d) }
          }
          if (new Set(cols).size !== cols.length) return
          const id = rows.length
          rows.push({ cols, cells: cage.cells.slice(), digits: assignment.slice() })
          for (const c of cols) columns[c].push(id)
          return
        }
        const c = cage.cells[i]
        for (const d of board[c] ? [board[c]] : [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
          if (variant === 'killer' && usedDigits.has(d)) continue
          if (cage.sum !== null && (d > left || left - d < cage.cells.length - i - 1 || left - d > 9 * (cage.cells.length - i - 1))) continue
          assignment[i] = d; usedDigits.add(d)
          tuples(i + 1, cage.sum === null ? null : left - d)
          usedDigits.delete(d)
        }
      }
      tuples(0, cage.sum)
    }
    const covered = Array(columns.length).fill(false), chosen = []
    function compatible(id) { spend(); return rows[id].cols.every(c => !covered[c]) }
    function visit() {
      if (count >= limit || exhausted) return
      if (nodes >= maxNodes) { exhausted = true; return }
      nodes++
      let options = null
      for (let c = 0; c < columns.length; c++) {
        if (covered[c]) continue
        const ids = columns[c].filter(compatible)
        if (!ids.length) return
        if (options === null || ids.length < options.length) { options = ids; if (ids.length === 1) break }
      }
      if (options === null) {
        count++
        if (!first) { first = Array(81).fill(0); for (const id of chosen) rows[id].cells.forEach((c, i) => { first[c] = rows[id].digits[i] }) }
        return
      }
      for (const id of options) {
        for (const c of rows[id].cols) covered[c] = true
        chosen.push(id); visit(); chosen.pop()
        for (const c of rows[id].cols) covered[c] = false
        if (count >= limit || exhausted) return
      }
    }
    visit()
  } catch (error) { if (error.message !== 'oracle-budget') throw error }
  return result()
}
