/**
 * Client helper for the conversational "Ask" mode.
 *
 * Pipeline:
 *   1. Run hybrid retrieval (lexical + semantic) using the
 *      pre-loaded verse embeddings — same code the concept-search
 *      tab uses, just returning the raw candidate list.
 *   2. POST { question, candidates } to /api/ask, which calls Groq's
 *      free LLM (Llama 3.3 70B) with a tight system prompt that
 *      forces citations from the provided candidates only.
 *   3. Receive { answer, cited_verses } and surface to the UI.
 *
 * Why client-side retrieval: the embedding model + verse vectors are
 * already in the browser for the concept-search tab. Reusing them
 * means /api/ask only does one cheap network hop (the LLM call) and
 * never has to load the embeddings server-side.
 */

import { retrieveCandidates } from '@/lib/concept-search'

export interface AskCitedVerse {
  verse_key: string
  text: string
  translation: string
}

export interface AskResult {
  answer: string
  cited_verses: AskCitedVerse[]
  error?: string
}

export type AskStatus = 'retrieving' | 'thinking' | 'done'

export async function askQuestion(
  question: string,
  onStatus?: (status: AskStatus) => void,
): Promise<AskResult> {
  const q = question.trim()
  if (q.length < 2) return { answer: '', cited_verses: [] }

  onStatus?.('retrieving')
  const candidates = await retrieveCandidates(q, 30)
  if (candidates.length === 0) {
    return {
      answer: '',
      cited_verses: [],
      error: 'No candidate verses retrieved — try rephrasing the question.',
    }
  }

  onStatus?.('thinking')
  let resp: Response
  try {
    resp = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q, candidates }),
    })
  } catch (e) {
    return {
      answer: '',
      cited_verses: [],
      error: e instanceof Error ? e.message : String(e),
    }
  }

  const data = (await resp.json().catch(() => ({}))) as Partial<AskResult>
  if (!resp.ok) {
    return {
      answer: '',
      cited_verses: [],
      error: data.error ?? `HTTP ${resp.status}`,
    }
  }
  onStatus?.('done')
  return {
    answer: data.answer ?? '',
    cited_verses: data.cited_verses ?? [],
  }
}
