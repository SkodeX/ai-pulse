// Anbieter-/Modell-Tags (Wunsch 2026-10-25): Regel-Erkennung, Genitive, Copilot, Quellen-Rückfall, Merge mit Claude.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Story } from '../../shared/types.ts'
import { detectEntities } from '../score/entities.ts'
import { withEntities } from '../score/stories.ts'

const story = (o: Partial<Story>): Story => ({
  id: 'x', clusterKey: 'a-b-c', title: '', originalTitle: '', url: 'https://example.com', sources: [{ id: 'techcrunch-ai', name: 'TC', url: 'https://example.com', lang: 'en' }],
  category: 'neuigkeiten', tags: [], impact: 5, personal: 5, score: 5, hype: false, paywall: false, firstSeen: '2026-10-25T08:00:00Z', ratedBy: 'regel', ...o,
})

test('Anbieter und Modelle mit Version', () => {
  assert.deepEqual(detectEntities('KI-Modell: Moonshot AI stellt Kimi K3.1 Pro vor'), { providers: ['Moonshot AI'], models: ['Kimi K3.1 Pro'] })
  assert.deepEqual(detectEntities('See what 5 builders are making with Gemini 4 Argon').models, ['Gemini 4 Argon'])
  assert.deepEqual(detectEntities('Five Qwen3.8-27B models match Fable 5').providers, ['Alibaba'])
  assert.ok(detectEntities('OpenAI releases GPT-6 Astra and GPT-6.1 Sol').models.includes('GPT-6 Astra'))
  assert.deepEqual(detectEntities('Claude Duet app is Anthropic’s bet on agents'), { providers: ['Anthropic'], models: ['Claude Duet'] })
})

test('Genitive, Copilot, Meta mit großem M, Allgemein', () => {
  assert.deepEqual(detectEntities('Nvidias offene Daten-Engine Flora').providers, ['NVIDIA'])
  assert.deepEqual(detectEntities('Global default for Copilot features generally available').providers, ['GitHub'])
  assert.deepEqual(detectEntities('Microsoft Copilot gets memory').providers, ['Microsoft'])
  assert.deepEqual(detectEntities('Meta delays new business terms after publisher pushback').providers, ['Meta'])
  assert.deepEqual(detectEntities('Eine Meta-Analyse zu Sprachmodellen').providers, [])
  assert.deepEqual(detectEntities('No signs of AI payoff outside the tech sector'), { providers: [], models: [] })
})

test('Rückfall auf die offizielle Quelle und Merge mit Claude-Angaben', () => {
  const s = withEntities(story({ originalTitle: 'Securing our frontier model training environment', sources: [{ id: 'openai-news', name: 'OpenAI News', url: 'u', lang: 'en' }] }))
  assert.deepEqual(s.providers, ['OpenAI'])
  const m = withEntities(story({ originalTitle: 'Block made an AI model that talks to you', providers: ['Block', 'openai'], models: ['Dessa'] }))
  assert.deepEqual(m.providers, ['Block', 'OpenAI'])
  assert.deepEqual(m.models, ['Dessa'])
  const general = withEntities(story({ originalTitle: 'USA und China bauen KI-Imperien auf' }))
  assert.deepEqual(general.providers, [])
})
