import { db } from './firebase-client'
import { ref, set, get, remove, onValue } from 'firebase/database'
import { Token, BattleMap, Initiative } from '@/types'

export async function getTokens(campaignId: string): Promise<Token[]> {
  try {
    const snapshot = await get(ref(db, `campaigns/${campaignId}/tokens`))
    if (snapshot.exists()) {
      return Object.values(snapshot.val()) as Token[]
    }
    return []
  } catch (err) {
    console.error(err)
    return []
  }
}

export async function createToken(campaignId: string, token: Omit<Token, 'id' | 'created_at'>) {
  try {
    const id = Math.random().toString(36).substring(7)
    const newToken: Token = {
      ...token,
      id,
      created_at: new Date().toISOString()
    }
    await set(ref(db, `campaigns/${campaignId}/tokens/${id}`), newToken)
    return newToken
  } catch (err) {
    console.error(err)
    return null
  }
}

export async function updateToken(campaignId: string, tokenId: string, updates: Partial<Token>) {
  try {
    const currentRef = ref(db, `campaigns/${campaignId}/tokens/${tokenId}`)
    const snapshot = await get(currentRef)
    const current = snapshot.val()
    const merged = { ...current, ...updates }
    await set(currentRef, merged)
    return merged
  } catch (err) {
    console.error(err)
    return null
  }
}

export async function deleteToken(campaignId: string, tokenId: string) {
  try {
    await remove(ref(db, `campaigns/${campaignId}/tokens/${tokenId}`))
    return true
  } catch (err) {
    console.error(err)
    return false
  }
}

export async function getMap(campaignId: string): Promise<BattleMap | null> {
  try {
    const snapshot = await get(ref(db, `campaigns/${campaignId}/map`))
    if (snapshot.exists()) {
      return snapshot.val() as BattleMap
    }
    return null
  } catch (err) {
    console.error(err)
    return null
  }
}

export async function saveMap(campaignId: string, mapUrl: string) {
  try {
    const map: BattleMap = {
      id: Math.random().toString(36).substring(7),
      campaign_id: campaignId,
      map_url: mapUrl,
      created_at: new Date().toISOString()
    }
    await set(ref(db, `campaigns/${campaignId}/map`), map)
    return map
  } catch (err) {
    console.error(err)
    return null
  }
}

export async function getInitiative(campaignId: string): Promise<Initiative | null> {
  try {
    const snapshot = await get(ref(db, `campaigns/${campaignId}/initiative`))
    if (snapshot.exists()) {
      return snapshot.val() as Initiative
    }
    return null
  } catch (err) {
    console.error(err)
    return null
  }
}

export async function saveInitiative(campaignId: string, tokenOrder: string[], currentIndex: number) {
  try {
    const initiative: Initiative = {
      id: Math.random().toString(36).substring(7),
      campaign_id: campaignId,
      token_order: tokenOrder,
      current_token_index: currentIndex,
      updated_at: new Date().toISOString()
    }
    await set(ref(db, `campaigns/${campaignId}/initiative`), initiative)
    return initiative
  } catch (err) {
    console.error(err)
    return null
  }
}

export function subscribeToTokens(campaignId: string, callback: (tokens: Token[]) => void) {
  const unsubscribe = onValue(ref(db, `campaigns/${campaignId}/tokens`), (snapshot) => {
    if (snapshot.exists()) {
      callback(Object.values(snapshot.val()) as Token[])
    } else {
      callback([])
    }
  })
  return unsubscribe
}

export function subscribeToMap(campaignId: string, callback: (map: BattleMap | null) => void) {
  const unsubscribe = onValue(ref(db, `campaigns/${campaignId}/map`), (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val() as BattleMap)
    } else {
      callback(null)
    }
  })
  return unsubscribe
}

export function subscribeToInitiative(campaignId: string, callback: (initiative: Initiative | null) => void) {
  const unsubscribe = onValue(ref(db, `campaigns/${campaignId}/initiative`), (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val() as Initiative)
    } else {
      callback(null)
    }
  })
  return unsubscribe
}
