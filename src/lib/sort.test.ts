import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Story } from '../../shared/types.ts';
import { isForMe, matchesQuery, normalize, sortStories } from './sort.ts';

const s = (o: Partial<Story>): Story => ({
  id: 'x', clusterKey: 'a-b-c', title: 'Titel', originalTitle: 'Title', url: 'https://example.com', sources: [{ id: 'q', name: 'Quelle', url: 'https://example.com', lang: 'de' }],
  category: 'neuigkeiten', tags: [], impact: 5, personal: 5, score: 5, hype: false, paywall: false, firstSeen: '2026-10-25T08:00:00Z', ratedBy: 'regel', ...o,
});

test('Sortierung Gesamt → Tragweite → firstSeen', () => {
  const list = [s({ id: 'a', score: 6, impact: 5 }), s({ id: 'b', score: 6, impact: 7 }), s({ id: 'c', score: 7 })];
  assert.deepEqual(sortStories(list, 'score').map(x => x.id), ['c', 'b', 'a']);
  assert.deepEqual(sortStories(list, 'personal').map(x => x.id).length, 3);
});

test('Suche normalisiert Umlaute, ß und Groß/Klein', () => {
  assert.equal(normalize('Straße Übersicht'), 'strasse ubersicht');
  assert.ok(matchesQuery(s({ title: 'Künstliche Intelligenz im Büro' }), 'kunstliche buro'));
  assert.ok(!matchesQuery(s({ title: 'Gesetz' }), 'modell'));
});

test('Für mich: eigene Werkzeuge in relevanter Kategorie', () => {
  assert.ok(isForMe(s({ category: 'preise', title: 'Claude Code wird günstiger' })));
  assert.ok(!isForMe(s({ category: 'funding', title: 'Claude-Startup sammelt Geld' })));
});
