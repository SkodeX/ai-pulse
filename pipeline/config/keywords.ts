// Keyword-Regeln für den Vorfilter (Skill quellen § 7). Jede Änderung an AI_RE mit Fixture-Test.

// Modellnamen mit direkt folgender Ziffer („Qwen3.8-27B", „GLM5", „Llama4") – \bqwen\b greift dort nicht (2026-10-25).
export const AI_RE = new RegExp(String.raw`\b(?:ki|ai|genai|llms?|gpt[-\w.]*|(?:qwen|gemma|llama|glm|kimi|grok|deepseek|gemini|claude|phi)\d[-\w.]*|chatgpt|codex|claude|anthropic|openai|gemini|gemma|deepmind|copilot|cursor|mistral|deepseek|qwen|llama|grok|xai|kimi|glm|zhipu|minimax|perplexity|hugging ?face|nvidia|mcp|agentic|(?:coding|software)[- ]agents?|chatbots?|prompt[- ]injection|inferen(?:ce|z)|sprachmodell\w*|(?:large )?language models?|foundation models?|machine learning|maschinelles lernen|deep learning|neural networks?|neuronale\w* netz\w*|künstliche[nr]? intelligenz|artificial intelligence|diffusion models?)\b`, 'i')

// Sponsor/Anzeige: Titel und Autor/Kategorie
export const SPONSOR_TITLE_RE = /^\s*(?:Anzeige|heise-Angebot):|\(Sponsor(?:ed)?\)/i
export const SPONSOR_META_RE = /MIT Technology Review Insights/i

// Vorabversionen (PEP 440: \d vorn für vllm v0.32.0rc3)
export const PRERELEASE_RE = /(^|[-.+_\s\d])(rc|alpha|beta|nightly|dev|preview)([-.+_\d\s]|$)/i

// Stoppwörter fürs Titel-Clustering (Ausgangspunkt Prototyp dryrun.mjs, ergänzt);
// werden genauso normalisiert wie die Titel (pipeline/cluster/title.ts).
export const STOP_WORDS = (
  'the a an and or of to in for on with by is are at from as its it this that new how why what after into over its your you ' +
  'der die das und mit für von zu im ein eine einen den des dem auf ist sich wie über nach bei aus nicht auch neue neuer neues jetzt'
).split(' ')
