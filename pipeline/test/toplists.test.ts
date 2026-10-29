// Top-50-Listen ohne Netz: Repo-Einträge, Ranking-Mix mit Wachstum, Aufsteiger, wöchentlicher Takt.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { TopListItem } from '../../shared/types.ts'
import { rankItems, repoItem, toplistsDue } from '../toplists/toplists.ts'

const NOW = new Date('2026-10-25T10:00:00Z')
const it = (id: string, stars: number): TopListItem => ({ id, name: id, url: `https://github.com/${id}`, description: '', stars, growth7d: null, updatedAt: '', topics: [] })

test('repoItem übernimmt Felder aus der GitHub-Suche', () => {
  const r = repoItem({ full_name: 'anthropics/skills', html_url: 'https://github.com/anthropics/skills', description: 'Agent Skills', stargazers_count: 183638, pushed_at: '2026-10-24T00:00:00Z', language: 'Python', topics: ['claude-code', 'skills'] })
  assert.equal(r.id, 'anthropics/skills')
  assert.equal(r.stars, 183638)
  assert.deepEqual(r.topics, ['claude-code', 'skills'])
})

test('ohne Vorwoche: Rang nach Sternen; mit Vorwoche: Mix aus Sternen und Wachstum, Aufsteiger markiert', () => {
  const items = [it('a/big', 100000), it('b/mid', 20000), it('c/small', 2000)]
  assert.deepEqual(rankItems(items, { snapshots: [] }, NOW).map(i => i.id), ['a/big', 'b/mid', 'c/small'])
  const history = { snapshots: [{ date: '2026-10-18', stars: { 'a/big': 99990, 'b/mid': 17000, 'c/small': 500 } }] }
  const ranked = rankItems(items, history, NOW)
  assert.equal(ranked.find(i => i.id === 'c/small')!.growth7d, 1500)
  assert.ok(ranked.find(i => i.id === 'c/small')!.rising)
  assert.ok(!ranked.find(i => i.id === 'a/big')!.rising, 'nur 10 neue Sterne')
  assert.equal(ranked[0]!.id, 'b/mid', 'viele Sterne und starkes Wachstum')
})

test('wöchentlicher Takt ab Sonntag (Berlin)', () => {
  assert.equal(toplistsDue(undefined, NOW), true)
  assert.equal(toplistsDue('2026-10-25T06:07:00Z', new Date('2026-10-27T06:07:00Z')), false, 'Sonntag gebaut, Dienstag nicht fällig')
  assert.equal(toplistsDue('2026-10-24T06:07:00Z', NOW), true, 'Samstag gebaut, Sonntag fällig')
})

test('Claude Skills: nur echte Skills und Skill-Sammlungen', async () => {
  const { isSkillRepo } = await import('../toplists/toplists.ts')
  const it = (name: string, description: string, topics: string[] = []) => repoItem({ full_name: name, html_url: 'u', description, stargazers_count: 1, topics })
  assert.ok(isSkillRepo(it('anthropics/skills', 'Agent Skills')))
  assert.ok(isSkillRepo(it('Leonxlnx/taste-skill', 'Design taste', ['claude-code'])))
  assert.ok(isSkillRepo(it('x/y', 'Tool', ['agent-skills'])))
  assert.ok(!isSkillRepo(it('farion1231/cc-switch', 'Switch providers for Claude Code', ['claude-code', 'codex'])))
  assert.ok(!isSkillRepo(it('a/skillet', 'Kitchen planner')))
})
