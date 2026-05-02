import type { SavedPlan, CatalogItem } from '@/store/use-scene-store'

const HEADERS: HeadersInit = {
  'Content-Type': 'application/json',
  'x-user-id': 'demo',
}

function assertOk(res: Response): Response {
  if (!res.ok) throw new Error(`API error ${res.status}: ${res.url}`)
  return res
}

async function json<T>(res: Response): Promise<T> {
  return assertOk(res).json() as Promise<T>
}

// ── Plans ──────────────────────────────────────────────────────────

export async function fetchPlans(): Promise<SavedPlan[]> {
  return fetch('/api/plans', { headers: HEADERS }).then((r) => json(r))
}

export async function fetchPlan(id: string): Promise<SavedPlan> {
  return fetch(`/api/plans/${id}`, { headers: HEADERS }).then((r) => json(r))
}

export async function createPlan(plan: SavedPlan): Promise<SavedPlan> {
  return fetch('/api/plans', {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(plan),
  }).then((r) => json(r))
}

export async function updatePlan(plan: SavedPlan): Promise<SavedPlan> {
  return fetch(`/api/plans/${plan.id}`, {
    method: 'PUT',
    headers: HEADERS,
    body: JSON.stringify(plan),
  }).then((r) => json(r))
}

export async function deletePlan(id: string): Promise<void> {
  const res = await fetch(`/api/plans/${id}`, { method: 'DELETE', headers: HEADERS })
  if (!res.ok) throw new Error(`Delete plan failed: ${res.status}`)
}

// ── Catalog ────────────────────────────────────────────────────────

export async function fetchCatalog(): Promise<CatalogItem[]> {
  return fetch('/api/catalog', { headers: HEADERS }).then((r) => json(r))
}

export async function createCatalogItem(item: Omit<CatalogItem, 'id'>): Promise<CatalogItem> {
  return fetch('/api/catalog', {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(item),
  }).then((r) => json(r))
}

export async function updateCatalogItem(
  id: string,
  item: Omit<CatalogItem, 'id'>
): Promise<CatalogItem> {
  return fetch(`/api/catalog/${id}`, {
    method: 'PUT',
    headers: HEADERS,
    body: JSON.stringify(item),
  }).then((r) => json(r))
}

export async function deleteCatalogItem(id: string): Promise<void> {
  const res = await fetch(`/api/catalog/${id}`, { method: 'DELETE', headers: HEADERS })
  if (!res.ok) throw new Error(`Delete catalog item failed: ${res.status}`)
}
