/**
 * Simple LLM completion test script.
 * Usage:
 *   docker exec workflow-api node dist/scripts/llm_test.js "Say hello"
 * (after building) or with tsx locally:
 *   npx tsx backend/src/scripts/llm_test.ts "Say hello"
 */

// Avoid using name 'prompt' (can conflict with global DOM prompt definition in TS libs)
const userPrompt = process.argv.slice(2).join(' ') || 'Hello'
const backendUrl = process.env.TEST_BACKEND_URL || 'http://localhost:5000'
const token = process.env.TEST_AUTH_TOKEN || 'mock-jwt-token'

async function run() {
  const res = await fetch(`${backendUrl}/api/llm/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ prompt: userPrompt }),
  })
  const text = await res.text()
  let parsed: any = null
  try { parsed = JSON.parse(text) } catch {}
  console.log('Status:', res.status)
  console.log('Raw:', text)
  if (parsed) console.log('Parsed content:', parsed.content)
}

run().catch(e => {
  console.error('Error running LLM test:', e)
  process.exit(1)
})
