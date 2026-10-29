// Setzt die System-Prompts je Stufe aus den Bausteinen zusammen (byte-gleich in beiden Backends).
// Ergebnis zusätzlich nach .cache/prompts/<stufe>.txt für --system-prompt-file.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Stage } from '../config/models.ts'
import { writeText } from '../lib/util.ts'

const DIR = join(import.meta.dirname, 'prompts')
const part = (name: string) => readFileSync(join(DIR, `${name}.txt`), 'utf8').trim()

const ORDER: Record<Exclude<Stage, 'weekly' | 'terms'>, string[]> = {
  triage: ['persona', 'triage', 'kategorien', 'rubriken', 'feldregeln', 'injection'],
  summarize: ['persona', 'summarize', 'rubriken', 'injection'],
  brief: ['persona', 'brief', 'injection'],
  usecases: ['persona', 'usecases', 'injection'],
}

export function systemPrompt(stage: keyof typeof ORDER): string {
  return ORDER[stage].map(part).join('\n\n') + '\n'
}

export async function systemPromptFile(stage: keyof typeof ORDER, cacheDir: string): Promise<{ text: string; file: string }> {
  const text = systemPrompt(stage)
  const file = join(cacheDir, 'prompts', `${stage}.txt`)
  await writeText(file, text)
  return { text, file }
}

// Fremdtext: spitze Klammern ersetzen, damit er keine eigenen Tags öffnen kann.
export function foreign(text: string): string {
  return text.replace(/</g, '‹').replace(/>/g, '›').replace(/"/g, '”')
}
