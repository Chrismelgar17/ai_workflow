import 'dotenv/config'
import { WhatsAppService } from '../integrations/whatsapp.js'
import { NangoClient } from '../integrations/nangoClient.js'

function getArg(flag: string) {
  const idx = process.argv.findIndex((a) => a === flag || a.startsWith(flag + '='))
  if (idx === -1) return undefined
  const v = process.argv[idx]
  const eq = v.indexOf('=')
  if (eq > -1) return v.slice(eq + 1)
  return process.argv[idx + 1]
}

async function main() {
  const providerConfigKey = process.env.WHATSAPP_PROVIDER_CONFIG_KEY || 'whatsapp-business'
  const nangoBase =
    getArg('--nangoBase') ||
    process.env.NANGO_API_BASE ||
    process.env.NANGO_API_BASE_DEV ||
    process.env.NANGO_API_BASE_PROD ||
    process.env.NANGO_HOST ||
    process.env.NANGO_HOST_DEV ||
    process.env.NANGO_HOST_PROD
  const nangoKey =
    getArg('--nangoKey') ||
    process.env.NANGO_SECRET_KEY ||
    process.env.NANGO_SECRET_KEY_DEV ||
    process.env.NANGO_SECRET_KEY_PROD
  const connectionId = getArg('--connectionId') || process.env.WHATSAPP_CONNECTION_ID
  const phoneNumberId = getArg('--phoneNumberId') || process.env.WHATSAPP_PHONE_NUMBER_ID
  const to = getArg('--to') || process.env.WHATSAPP_TEST_TO
  const body = getArg('--body') || process.env.WHATSAPP_TEST_BODY || 'Hello from Workflow Backend via Nango Proxy!'
  const debug = !!getArg('--debug')
  const msgType = (getArg('--type') || 'text').toLowerCase()
  const templateName = getArg('--templateName')
  const templateLang = getArg('--templateLang') || 'en_US'

  // Allow shortcut: body formatted as __TEMPLATE__:name|lang
  let inferredTemplate: { name: string; language: { code: string }; components: any[] } | null = null
  if (!getArg('--templateName') && body.startsWith('__TEMPLATE__:')) {
    const raw = body.replace('__TEMPLATE__:', '')
    const [name, lang] = raw.split('|')
    if (name) {
      inferredTemplate = { name, language: { code: lang || templateLang }, components: [] }
    }
  }

  if (!connectionId || !phoneNumberId || !to) {
    console.error('Missing required inputs. Provide via env or flags:\n  --connectionId <id> --phoneNumberId <id> --to <E.164 number> [--body "text"]')
    process.exit(1)
  }

  const client = new NangoClient({ baseUrl: nangoBase, secretKey: nangoKey })
  const svc = new WhatsAppService(client)
  if (debug) {
    console.log('[debug] Configuration:\n', JSON.stringify({ providerConfigKey, nangoBase, connectionId, phoneNumberId, to }, null, 2))
  }
  try {
    let res: any
    if (msgType === 'template' || inferredTemplate) {
      const finalTemplate = inferredTemplate || {
        name: templateName!,
        language: { code: templateLang },
        components: [],
      }
      if (!finalTemplate.name) {
        console.error('Template mode selected but no template name supplied. Use --templateName <name> or body="__TEMPLATE__:name|lang".')
        process.exit(1)
      }
      res = await svc.sendTemplate({
        providerConfigKey,
        connectionId,
        phoneNumberId,
        to,
        template: finalTemplate,
      })
    } else {
      res = await svc.sendText({ providerConfigKey, connectionId, phoneNumberId, to, body })
    }
    console.log('Sent. Response:', JSON.stringify(res, null, 2))
  } catch (e: any) {
    console.error('Send failed:', e?.response?.status || e.code, e?.response?.data || e.message)
    if (e.code === 'HPE_INVALID_CONSTANT' || debug) {
      console.log('\n[debug] Detected parse error. Attempting diagnostic GET and raw proxy with Accept-Encoding=identity...')
      try {
        const endpoint = `v20.0/${phoneNumberId}`
        const info = await client.proxy('GET', endpoint, {
          providerConfigKey,
          connectionId,
          baseUrlOverride: 'https://graph.facebook.com',
          headers: { 'nango-proxy-Accept-Encoding': 'identity' },
        })
        console.log('[debug] Phone number endpoint response:', JSON.stringify(info, null, 2))
      } catch (e2: any) {
        console.error('[debug] GET number failed:', e2?.response?.status || e2.code, e2?.response?.data || e2.message)
      }
      // Attempt a raw POST without preview_url & with identity encoding
      try {
        const endpoint = `v20.0/${phoneNumberId}/messages`
        const raw = await client.proxy('POST', endpoint, {
          providerConfigKey,
          connectionId,
          baseUrlOverride: 'https://graph.facebook.com',
          headers: { 'nango-proxy-Accept-Encoding': 'identity', Decompress: 'true' },
          data: {
            messaging_product: 'whatsapp',
            to,
            type: 'text',
            text: { body },
          },
        })
        console.log('[debug] Fallback raw POST response:', JSON.stringify(raw, null, 2))
      } catch (e3: any) {
        console.error('[debug] Fallback raw POST failed:', e3?.response?.status || e3.code, e3?.response?.data || e3.message)
      }
      console.log('\n[debug] Troubleshooting suggestions:')
      console.log('- Ensure your Nango provider config for whatsapp-business specifies how to inject the access token (Authorization: Bearer <token>).')
      console.log('- Verify the imported connection uses the correct provider_config_key (exact match: whatsapp-business).')
      console.log('- Confirm the WhatsApp Cloud access token is still valid and has messages:send permission.')
      console.log('- Double check phoneNumberId is correct and matches the Graph phone number ID (not the business account ID).')
      console.log('- Try a direct curl to Graph API outside Nango to confirm token & phone number ID:')
      console.log('  curl -v -X POST https://graph.facebook.com/v20.0/' + phoneNumberId + '/messages \\\n    -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \\\n    -d "{\\"messaging_product\\":\\"whatsapp\\",\\"to\\":\\"' + to + '\\",\\"type\\":\\"text\\",\\"text\\":{\\"body\\":\\"' + body.replace(/"/g,'\\"') + '\\"}}"')
      console.log('- In Nango, confirm the credential type (API_KEY vs OAuth2). For WhatsApp Cloud long-lived token, API_KEY is acceptable if mapped to Authorization header.')
    }
    process.exit(1)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
