import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

type Agent = {
  id: string
  name: string
  model: string
  provider: string
  language?: string
  prompt?: string
  config?: Record<string, unknown>
}

const dataDir = join(process.cwd(), 'data')
const dataFile = join(dataDir, 'agents.json')

function ensureDirectory() {
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true })
  }
}

function loadFromDisk(): Record<string, Agent> {
  try {
    ensureDirectory()
    if (!existsSync(dataFile)) {
      writeFileSync(dataFile, '{}')
      return {}
    }
    const raw = readFileSync(dataFile, 'utf-8').trim()
    if (!raw) return {}
    return JSON.parse(raw)
  } catch (error) {
    console.error('Failed to read agents file', error)
    return {}
  }
}

function writeToDisk(store: Record<string, Agent>) {
  try {
    ensureDirectory()
    writeFileSync(dataFile, JSON.stringify(store, null, 2))
  } catch (error) {
    console.error('Failed to persist agents file', error)
  }
}

const cachedStore: Record<string, Agent> = (globalThis as any).__AGENTS_STORE || loadFromDisk()
;(globalThis as any).__AGENTS_STORE = cachedStore

export function getAgentStore() {
  return cachedStore
}

export function persistAgentStore() {
  writeToDisk(cachedStore)
}
