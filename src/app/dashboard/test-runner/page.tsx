'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function TestRunnerPage() {
  const { data: flows } = useQuery({ queryKey: ['flows'], queryFn: () => apiClient.getFlows() })
  const [selectedFlow, setSelectedFlow] = useState<string>('')
  const [inputJson, setInputJson] = useState<string>('{}')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string>('')
  const [intResult, setIntResult] = useState<any>(null)
  const [intError, setIntError] = useState<string>('')

  // Minimal forms for Twilio SMS, WhatsApp text, and GCal create event
  const [twilio, setTwilio] = useState({ providerConfigKey: 'twilio', connectionId: '', accountSid: '', from: '', to: '', body: 'Hello from unified!', mediaUrl: '' })
  const [whatsapp, setWhatsapp] = useState({ providerConfigKey: 'whatsapp-business', connectionId: '', phoneNumberId: '', to: '', body: 'Hello from WhatsApp!', type: 'text', imageUrl: '', caption: '' })
  const [gcal, setGcal] = useState({ providerConfigKey: 'google-calendar', connectionId: '', calendarId: 'primary', summary: 'Demo Event', start: '', end: '', timezone: 'UTC' })

  const runTest = async () => {
    setError('')
    setResult(null)
    try {
      // Placeholder until backend exposes execution endpoint
      const parsed = JSON.parse(inputJson)
      setResult({ ok: true, simulated: true, flowId: selectedFlow, input: parsed })
    } catch (e: any) {
      setError(e.message)
    }
  }

  const sendTwilio = async () => {
    setIntError(''); setIntResult(null)
    try {
      const payload = {
        provider: 'nango',
        resource: 'twilio.sms',
        operation: 'create',
        data: {
          providerConfigKey: twilio.providerConfigKey,
          connectionId: twilio.connectionId,
          accountSid: twilio.accountSid,
          from: twilio.from,
          to: twilio.to,
          body: twilio.body,
          mediaUrl: twilio.mediaUrl || undefined,
        }
      }
      const r = await apiClient.unifiedAction(payload as any)
      setIntResult(r)
    } catch (e: any) {
      setIntError(e?.response?.data?.error || e?.message || 'failed')
    }
  }

  const sendWhatsApp = async () => {
    setIntError(''); setIntResult(null)
    try {
      const base = {
        provider: 'nango',
        resource: 'whatsapp.message',
        operation: 'create',
        data: {
          providerConfigKey: whatsapp.providerConfigKey,
          connectionId: whatsapp.connectionId,
          phoneNumberId: whatsapp.phoneNumberId,
          to: whatsapp.to,
        }
      } as any
      if (whatsapp.type === 'image') {
        base.data.type = 'image'
        base.data.imageUrl = whatsapp.imageUrl
        base.data.caption = whatsapp.caption
      } else {
        base.data.body = whatsapp.body
      }
      const r = await apiClient.unifiedAction(base)
      setIntResult(r)
    } catch (e: any) {
      setIntError(e?.response?.data?.error || e?.message || 'failed')
    }
  }

  const createGCalEvent = async () => {
    setIntError(''); setIntResult(null)
    try {
      const start = gcal.start || new Date(Date.now() + 10 * 60 * 1000).toISOString()
      const end = gcal.end || new Date(Date.now() + 70 * 60 * 1000).toISOString()
      const r = await apiClient.unifiedAction({
        provider: 'nango',
        resource: 'gcal.event',
        operation: 'create',
        data: {
          providerConfigKey: gcal.providerConfigKey,
          connectionId: gcal.connectionId,
          calendarId: gcal.calendarId,
          event: { summary: gcal.summary, start: { dateTime: start, timeZone: gcal.timezone }, end: { dateTime: end, timeZone: gcal.timezone } },
        }
      } as any)
      setIntResult(r)
    } catch (e: any) {
      setIntError(e?.response?.data?.error || e?.message || 'failed')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Test Runner</h1>
        <p className="text-gray-600 dark:text-gray-400">Run workflows with sandboxed input</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Run a Test</CardTitle>
          <CardDescription>Select a workflow and provide input JSON</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Workflow</label>
              <select className="w-full h-10 border rounded-md px-3" value={selectedFlow} onChange={(e) => setSelectedFlow(e.target.value)}>
                <option value="">Select a flow…</option>
                {Array.isArray(flows) && flows.map((f: any) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Input (JSON)</label>
              <textarea className="w-full h-40 border rounded-md p-3 font-mono text-sm" value={inputJson} onChange={(e) => setInputJson(e.target.value)} />
            </div>
          </div>
          <Button onClick={runTest} disabled={!selectedFlow}>Run Test</Button>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          {result && (
            <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-auto">{JSON.stringify(result, null, 2)}</pre>
          )}
        </CardContent>
      </Card>

      {/* Unified actions quick triggers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Twilio */}
        <Card>
          <CardHeader>
            <CardTitle>Twilio SMS/MMS</CardTitle>
            <CardDescription>Send an SMS/MMS via Nango</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Provider Config Key (twilio)" value={twilio.providerConfigKey} onChange={e=>setTwilio(s=>({...s,providerConfigKey:e.target.value}))} />
            <Input placeholder="Connection ID" value={twilio.connectionId} onChange={e=>setTwilio(s=>({...s,connectionId:e.target.value}))} />
            <Input placeholder="Account SID" value={twilio.accountSid} onChange={e=>setTwilio(s=>({...s,accountSid:e.target.value}))} />
            <Input placeholder="From" value={twilio.from} onChange={e=>setTwilio(s=>({...s,from:e.target.value}))} />
            <Input placeholder="To" value={twilio.to} onChange={e=>setTwilio(s=>({...s,to:e.target.value}))} />
            <Input placeholder="Body" value={twilio.body} onChange={e=>setTwilio(s=>({...s,body:e.target.value}))} />
            <Input placeholder="Media URL (optional)" value={twilio.mediaUrl} onChange={e=>setTwilio(s=>({...s,mediaUrl:e.target.value}))} />
            <Button onClick={sendTwilio} disabled={!twilio.providerConfigKey||!twilio.connectionId||!twilio.accountSid||!twilio.from||!twilio.to}>Send</Button>
          </CardContent>
        </Card>

        {/* WhatsApp */}
        <Card>
          <CardHeader>
            <CardTitle>WhatsApp Message</CardTitle>
            <CardDescription>Send text or image via WhatsApp Cloud</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Provider Config Key (whatsapp-business)" value={whatsapp.providerConfigKey} onChange={e=>setWhatsapp(s=>({...s,providerConfigKey:e.target.value}))} />
            <Input placeholder="Connection ID" value={whatsapp.connectionId} onChange={e=>setWhatsapp(s=>({...s,connectionId:e.target.value}))} />
            <Input placeholder="Phone Number ID" value={whatsapp.phoneNumberId} onChange={e=>setWhatsapp(s=>({...s,phoneNumberId:e.target.value}))} />
            <Input placeholder="To" value={whatsapp.to} onChange={e=>setWhatsapp(s=>({...s,to:e.target.value}))} />
            <div className="grid grid-cols-2 gap-2">
              <select className="h-10 border rounded-md px-3" value={whatsapp.type} onChange={e=>setWhatsapp(s=>({...s,type:e.target.value}))}>
                <option value="text">Text</option>
                <option value="image">Image</option>
              </select>
              {whatsapp.type==='text' ? (
                <Input placeholder="Body" value={whatsapp.body} onChange={e=>setWhatsapp(s=>({...s,body:e.target.value}))} />
              ) : (
                <>
                  <Input placeholder="Image URL" value={whatsapp.imageUrl} onChange={e=>setWhatsapp(s=>({...s,imageUrl:e.target.value}))} />
                  <Input placeholder="Caption (optional)" value={whatsapp.caption} onChange={e=>setWhatsapp(s=>({...s,caption:e.target.value}))} />
                </>
              )}
            </div>
            <Button onClick={sendWhatsApp} disabled={!whatsapp.providerConfigKey||!whatsapp.connectionId||!whatsapp.phoneNumberId||!whatsapp.to|| (whatsapp.type==='text' ? !whatsapp.body : !whatsapp.imageUrl)}>Send</Button>
          </CardContent>
        </Card>

        {/* Google Calendar */}
        <Card>
          <CardHeader>
            <CardTitle>Google Calendar</CardTitle>
            <CardDescription>Create an event via Nango</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Provider Config Key (google-calendar)" value={gcal.providerConfigKey} onChange={e=>setGcal(s=>({...s,providerConfigKey:e.target.value}))} />
            <Input placeholder="Connection ID" value={gcal.connectionId} onChange={e=>setGcal(s=>({...s,connectionId:e.target.value}))} />
            <Input placeholder="Calendar ID (primary)" value={gcal.calendarId} onChange={e=>setGcal(s=>({...s,calendarId:e.target.value}))} />
            <Input placeholder="Summary" value={gcal.summary} onChange={e=>setGcal(s=>({...s,summary:e.target.value}))} />
            <Input placeholder="Start (ISO)" value={gcal.start} onChange={e=>setGcal(s=>({...s,start:e.target.value}))} />
            <Input placeholder="End (ISO)" value={gcal.end} onChange={e=>setGcal(s=>({...s,end:e.target.value}))} />
            <Input placeholder="Timezone (UTC)" value={gcal.timezone} onChange={e=>setGcal(s=>({...s,timezone:e.target.value}))} />
            <Button onClick={createGCalEvent} disabled={!gcal.providerConfigKey||!gcal.connectionId}>Create Event</Button>
          </CardContent>
        </Card>
      </div>

      {(intError || intResult) && (
        <Card>
          <CardHeader>
            <CardTitle>Integration Result</CardTitle>
          </CardHeader>
          <CardContent>
            {intError && <div className="text-red-600 text-sm mb-2">{intError}</div>}
            {intResult && (
              <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-auto">{JSON.stringify(intResult, null, 2)}</pre>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
