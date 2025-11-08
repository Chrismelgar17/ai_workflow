import { NangoClient } from './nangoClient.js'
import { PanoraClient } from './panoraClient.js'

// Input payload contract for unifiedAction
// provider: which aggregator to use ('nango' | 'panora')
// resource: high-level domain (e.g. 'crm.contact', 'hr.employee')
// operation: list|get|create|update|delete (only list/get/create implemented now)
// id: optional identifier for get
// data: payload for create/update
export interface UnifiedActionInput {
  provider: 'nango' | 'panora'
  resource: string
  operation: 'list' | 'get' | 'create' | 'update' | 'delete'
  id?: string
  data?: any
  params?: any
}

export async function unifiedAction(input: UnifiedActionInput) {
  const { provider, resource, operation, id, data, params } = input
  if (!provider) throw Object.assign(new Error('provider required'), { status: 400 })
  if (!resource) throw Object.assign(new Error('resource required'), { status: 400 })
  if (!operation) throw Object.assign(new Error('operation required'), { status: 400 })

  // Map resource string to domain + entity
  // Pattern: domain.entity -> domain: crm|hr, entity: contact|employee etc.
  const [domain, entity] = resource.split('.')
  if (!domain || !entity) throw Object.assign(new Error('resource must be domain.entity'), { status: 400 })

  switch (provider) {
    case 'nango':
      return handleNango(domain, entity, operation, { id, data, params })
    case 'panora':
      return handlePanora(domain, entity, operation, { id, data, params })
    default:
      throw Object.assign(new Error('unsupported provider'), { status: 400 })
  }
}

async function handleNango(domain: string, entity: string, op: string, ctx: { id?: string; data?: any; params?: any }) {
  const client = new NangoClient()
  if (domain === 'crm' && entity === 'contact') {
    switch (op) {
      case 'list': return client.listCRMContacts(ctx.params)
      case 'get': if (!ctx.id) throw Object.assign(new Error('id required'), { status: 400 }); return client.getCRMContact(ctx.id)
      case 'create': return client.createCRMContact(ctx.data)
    }
  }
  if (domain === 'hr' && entity === 'employee') {
    switch (op) {
      case 'list': return client.listHRISEmployees(ctx.params)
      case 'get': if (!ctx.id) throw Object.assign(new Error('id required'), { status: 400 }); return client.getHRISEmployee(ctx.id)
    }
  }
  throw Object.assign(new Error('unsupported resource for nango'), { status: 400 })
}

async function handlePanora(domain: string, entity: string, op: string, ctx: { id?: string; data?: any; params?: any }) {
  const client = new PanoraClient()
  if (domain === 'crm' && entity === 'contact') {
    switch (op) {
      case 'list': return client.listCRMContacts(ctx.params)
      case 'get': if (!ctx.id) throw Object.assign(new Error('id required'), { status: 400 }); return client.getCRMContact(ctx.id)
      case 'create': return client.createCRMContact(ctx.data)
    }
  }
  if (domain === 'hr' && entity === 'employee') {
    switch (op) {
      case 'list': return client.listHRISEmployees(ctx.params)
      case 'get': if (!ctx.id) throw Object.assign(new Error('id required'), { status: 400 }); return client.getHRISEmployee(ctx.id)
    }
  }
  throw Object.assign(new Error('unsupported resource for panora'), { status: 400 })
}
