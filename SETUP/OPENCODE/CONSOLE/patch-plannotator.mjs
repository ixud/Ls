#!/usr/bin/env node
/* BAZER — patch-plannotator.mjs   (ปลายทางจริง: CONSOLE\patch-plannotator.mjs)
 *
 * ทำให้ปุ่ม approve ของ Plannotator (Plan Mode) ชี้ไปที่ **subagent `builder`** และโชว์ label "Builder"
 * แทน primary agent `build`
 *
 * ทำไมต้องเป็นสคริปต์ ไม่ใช่แก้มือ: Plannotator ติดตั้งจาก npm เข้า cache ของ OpenCode —
 * อัปเดต/ติดตั้งใหม่เมื่อไร plannotator.html จะถูกทับด้วยของใหม่ (patch หลุด) รันสคริปต์นี้ซ้ำ = กลับมา
 * รันซ้ำบนไฟล์ที่แพตช์แล้ว = ไม่เขียนอะไรเลย (idempotent)
 *
 * ไฟล์ที่แตะ (ค้นหาอัตโนมัติทั้งสองแบบของ cache):
 *   %USERPROFILE%\.cache\opencode\npm\@plannotator\opencode@latest\**\node_modules\@plannotator\opencode\plannotator.html
 *   %USERPROFILE%\.cache\opencode\packages\@plannotator\opencode@latest\node_modules\@plannotator\opencode\plannotator.html
 *
 * ใครเรียกใช้:
 *   - มนุษย์: `node patch-plannotator.mjs [--dry-run|--list]`
 *   - BAZER Console: action `plannotator-patch` (ปุ่ม "แพตช์ปุ่มอนุมัติ → builder") และติดไปกับ
 *     `flow-apply` (ติดตั้ง/ซ่อม BAZER FLOW v2) · `update-apply` (อัพเดตทั้งหมด) · `sync-all` (ซิงค์ทั้งหมด)
 *     · `setup-apply` (ขั้น `plannotator-patch`) — เครื่องใหม่ที่ยังไม่มี cache จะข้ามอย่างเงียบแล้วลองใหม่ทุกครั้ง
 *   - `flow-check.mjs` เฝ้าว่า patch ยังอยู่ (WARN + บอกคำสั่งนี้เมื่อ Plannotator อัปเดตแล้วหลุด)
 *
 * 4 จุด (แต่ละจุดต้องเจอ "หนึ่งครั้งเท่านั้น" ไม่เช่นนั้น target นั้นไม่ถูกแตะ):
 *   1 default หลังอนุมัติ      {switchTo:"build"}            -> {switchTo:"builder"}
 *   2 เมนู "After approval"    value/label/description       -> builder / Builder / subagent
 *   3 label บนปุ่ม             t.find(...)?.name??e.switchTo -> ห่อ capitalize (โชว์ "Builder")
 *                             (ค่า switchTo ต้องคง "builder" ตัวเล็ก เพราะ server เทียบ agent.name)
 *   4 key localStorage         "plannotator-agent-switch"    -> "plannotator-approve-agent"
 *                             (กันค่าเก่าในเบราว์เซอร์ชนะ default ใหม่)
 *
 * Usage:
 *   node patch-plannotator.mjs [--dry-run] [--list] [--target <plannotator.html>]...
 *     (ไม่ระบุ target = แพตช์ทุกไฟล์ที่ค้นเจอ · --dry-run = พิมพ์แผน+จำนวน ไม่เขียน)
 *   exit: 0 = เขียน/ไม่มีอะไรต้องทำ · 1 = มี target ที่ตีความไม่ได้ (target นั้นไม่ถูกแตะ) · 2 = --target ที่ระบุไม่มีจริง
 */
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { pathToFileURL } from 'node:url'

export const count = (text, needle) => {
  let n = 0
  let i = text.indexOf(needle)
  while (i !== -1) {
    n += 1
    i = text.indexOf(needle, i + needle.length)
  }
  return n
}

const MENU_FROM = '{value:"build",label:"Build",description:"Switch to build agent after approval"}'
const MENU_TO = '{value:"builder",label:"Builder",description:"Switch to builder subagent after approval"}'
const LABEL_MARK = ')?.name??e.switchTo}' // ก่อนแพตช์
const LABEL_DONE = '?.name??e.switchTo)}' // หลังแพตช์ (ปิด call ก่อน `}` ของฟังก์ชัน)
const LABEL_WRAP = '((n)=>n?n.charAt(0).toUpperCase()+String(n).slice(1):n)('
const KEY_FROM = '"plannotator-agent-switch"'
const KEY_TO = '"plannotator-approve-agent"'
const FIND_CALL = 't.find('

/** หา expression ของ label ที่ลงท้ายด้วย LABEL_MARK: คืน { start, end, region, wrapped } (region รวม `}` ตัวสุดท้าย) */
function labelRegion(text) {
  const tail = text.indexOf(LABEL_MARK)
  if (tail === -1) return null
  const start = text.lastIndexOf(FIND_CALL, tail)
  if (start === -1) return null
  const region = text.slice(start, tail + LABEL_MARK.length) // `t.find(...)?.name??e.switchTo}`
  const core = region.slice(0, -1) // ตัด `}` ของฟังก์ชันออก
  return { start, end: tail + LABEL_MARK.length, region, core, wrapped: LABEL_WRAP + core + ')}' }
}

export const PATCHES = [
  { id: 'default-approve-target', from: '{switchTo:"build"}', to: '{switchTo:"builder"}' },
  { id: 'settings-menu-entry', from: MENU_FROM, to: MENU_TO },
  { id: 'label-capitalisation' },
  { id: 'localstorage-key', from: KEY_FROM, to: KEY_TO },
]

/** 'todo' | 'applied' | 'na' — อย่างอื่น = throw (ไม่เดา) */
function stateOf(patch, text) {
  if (patch.id === 'label-capitalisation') {
    const wraps = count(text, LABEL_WRAP)
    const naive = count(text, LABEL_MARK)
    const done = count(text, LABEL_DONE)
    if (wraps === 1 && done === 1 && naive === 0) return 'applied'
    if (wraps === 0 && done === 0 && naive === 1) return 'todo'
    if (wraps === 0 && done === 0 && naive === 0) return 'na'
    throw new Error(`${patch.id}: สภาพไฟล์ตีความไม่ได้ (wrapper=${wraps}, done=${done}, marker=${naive})`)
  }
  const before = count(text, patch.from)
  const after = count(text, patch.to)
  if (before === 1 && after === 0) return 'todo'
  if (before === 0 && after === 1) return 'applied'
  if (before === 0 && after === 0) return 'na'
  throw new Error(`${patch.id}: พบต้นฉบับ ${before} / ปลายทาง ${after} (ต้องเป็น 1/0 หรือ 0/1)`)
}

function applyPatch(patch, text) {
  if (patch.id === 'label-capitalisation') {
    const r = labelRegion(text)
    return text.slice(0, r.start) + r.wrapped + text.slice(r.end)
  }
  const at = text.indexOf(patch.from)
  return text.slice(0, at) + patch.to + text.slice(at + patch.from.length)
}

export function plan(text) {
  return PATCHES.map((p) => ({ patch: p, state: stateOf(p, text) }))
}

function verify(text) {
  const bad = plan(text).filter((x) => x.state !== 'applied')
  if (bad.length) throw new Error('หลังแพตช์แล้วยังไม่ครบ: ' + bad.map((b) => `${b.patch.id}=${b.state}`).join(', '))
}

export function discoverTargets(home = os.homedir()) {
  const roots = [
    path.join(home, '.cache', 'opencode', 'npm', '@plannotator'),
    path.join(home, '.cache', 'opencode', 'packages', '@plannotator'),
  ]
  const found = new Map()
  const walk = (dir, depth = 0) => {
    if (depth > 6) return
    let entries = []
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) walk(p, depth + 1)
      else if (e.name === 'plannotator.html') {
        try { found.set(p, fs.statSync(p).mtimeMs) } catch {}
      }
    }
  }
  for (const r of roots) walk(r)
  return [...found.entries()].sort((a, b) => b[1] - a[1]).map(([file, mtime]) => ({ file, mtime }))
}

const stamp = (d = new Date()) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-` +
  `${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`

const uniqueBackup = (file) => {
  const base = `${file}.bak-${stamp()}`
  let c = base
  let n = 1
  while (fs.existsSync(c)) c = `${base}-${n++}`
  return c
}

/** UTF-8 round-trip guard: ไฟล์ 23 MB minified — ต้องมั่นใจว่า decode/encode ไม่เพี้ยนก่อนเขียนคืน */
function readUtf8(file) {
  const buf = fs.readFileSync(file)
  const text = buf.toString('utf8')
  if (Buffer.compare(Buffer.from(text, 'utf8'), buf) !== 0)
    throw new Error('UTF-8 round-trip ไม่ตรง (ไฟล์อาจมีไบต์ที่ถอดไม่ได้) — ไม่เขียนไฟล์')
  return text
}

function patchFile(file, { dryRun, quiet = false }) {
  const say = (...args) => { if (!quiet) console.log(...args) }
  const version = (() => {
    try { return JSON.parse(fs.readFileSync(path.join(path.dirname(file), 'package.json'), 'utf8')).version } catch { return '?' }
  })()
  say(`[patch-plannotator] target=${file} (v${version}, ${fs.statSync(file).size} bytes)`)
  const original = readUtf8(file)
  const states = plan(original)
  for (const s of states) {
    const tag = s.state === 'todo' ? 'apply' : s.state === 'applied' ? 'ok   ' : 'na   '
    say(`  ${tag} ${s.patch.id}${s.state === 'na' ? ' (ไม่มีในเวอร์ชันนี้)' : ''}`)
  }

  const todo = states.filter((s) => s.state === 'todo').map((s) => s.patch)
  const skipped = states.length - todo.length
  const detail = { file, version, applied: todo.length, skipped, states: states.map((s) => `${s.patch.id}=${s.state}`) }
  if (!todo.length) {
    say(`applied=0 skipped=${skipped} target=${file} backup=none dryRun=${dryRun}`)
    return detail
  }

  let next = original
  for (const p of todo) next = applyPatch(p, next)
  verify(next) // in memory ก่อนเขียนจริง

  if (dryRun) {
    say(`applied=${todo.length} skipped=${skipped} target=${file} backup=none dryRun=true`)
    return detail
  }

  const backup = uniqueBackup(file)
  fs.copyFileSync(file, backup)
  fs.writeFileSync(file, next, 'utf8')
  try {
    verify(readUtf8(file)) // อ่านไบต์จริงกลับมาตรวจ
  } catch (error) {
    fs.copyFileSync(backup, file)
    throw new Error(`${error.message} — คืนไฟล์จาก ${backup} แล้ว`)
  }
  say(`applied=${todo.length} skipped=${skipped} target=${file} backup=${backup} dryRun=false`)
  return { ...detail, backup }
}

/** API สำหรับ Console (import ไปใช้) — ไม่ throw ถ้าไฟล์ใดไฟล์หนึ่งพัง: คืน errors ให้ผู้เรียกตัดสินใจ */
export function applyAll({ dryRun = false, home = os.homedir(), targets = null, quiet = false } = {}) {
  const say = (...args) => { if (!quiet) console.log(...args) }
  const discovered = discoverTargets(home).map((t) => t.file)
  const files = Array.isArray(targets) && targets.length ? targets : discovered
  const missing = files.filter((f) => !fs.existsSync(f))
  const details = []
  let applied = 0
  let skipped = 0
  let errors = 0
  for (const f of files) {
    if (!fs.existsSync(f)) { errors += 1; details.push({ file: f, error: 'ไม่พบไฟล์' }); continue }
    try {
      const d = patchFile(f, { dryRun, quiet })
      applied += d.applied
      skipped += d.skipped
      details.push(d)
    } catch (error) {
      errors += 1
      say(`[patch-plannotator] ERROR ${f} — ${error.message}`)
      details.push({ file: f, error: error.message })
    }
  }
  return { targets: files.length, discovered: discovered.length, applied, skipped, errors, missing, dryRun, details }
}

function main(argv) {
  let dryRun = false
  let list = false
  const targets = []
  const args = [...argv]
  while (args.length) {
    const a = args.shift()
    if (a === '--dry-run') dryRun = true
    else if (a === '--list') list = true
    else if (a === '--target') targets.push(args.shift() || '')
    else if (a === '--help' || a === '-h') {
      console.log('usage: node patch-plannotator.mjs [--dry-run] [--list] [--target <plannotator.html>]...')
      return 0
    } else throw new Error(`ไม่รู้จัก argument: ${a}`)
  }

  const discovered = discoverTargets()
  if (list) {
    console.log(`[patch-plannotator] พบ ${discovered.length} ไฟล์:`)
    for (const t of discovered) console.log('  ' + t.file)
    return 0
  }

  const files = targets.length ? targets : discovered.map((t) => t.file)
  if (!files.length) {
    console.log('TOTAL applied=0 skipped=0 targets=0 errors=0 dryRun=' + dryRun)
    console.log('[patch-plannotator] ไม่พบ plannotator.html (ยังไม่ได้ติดตั้ง Plannotator) — ไม่มีอะไรต้องทำ')
    return 0
  }
  for (const f of files) if (!fs.existsSync(f)) {
    console.error(`[patch-plannotator] target ที่ระบุไม่มีจริง: ${f}`)
    return 2
  }
  if (files.length > 1) console.log(`[patch-plannotator] พบ ${files.length} ไฟล์ — แพตช์ทุกไฟล์ (ใหม่สุดก่อน)`)

  const r = applyAll({ dryRun, targets: targets.length ? targets : null })
  console.log(`TOTAL applied=${r.applied} skipped=${r.skipped} targets=${r.targets} errors=${r.errors} dryRun=${dryRun}`)
  return r.errors ? 1 : 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = main(process.argv.slice(2))
  } catch (error) {
    console.error(`[patch-plannotator] ABORT — ${error.message}`)
    console.error('TOTAL applied=0 skipped=0 targets=0 errors=1 (ไม่มีการเขียนไฟล์)')
    process.exitCode = 1
  }
}
