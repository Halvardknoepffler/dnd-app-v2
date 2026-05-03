export interface Token {
  id: string
  campaign_id: string
  name: string
  type: 'pj' | 'monstre' | 'pnj'
  image_url: string | null
  x: number
  y: number
  size: number
  hp: number
  max_hp: number
  owner_id: string | null
  created_at: string
}

export interface BattleMap {
  id: string
  campaign_id: string
  map_url: string
  created_at: string
}

export interface Initiative {
  id: string
  campaign_id: string
  token_order: string[]
  current_token_index: number
  updated_at: string
}

export interface Campaign {
  id: string
  name: string
  dm_id: string
  created_at: string
}

export interface Save {
  id: string
  campaign_id: string
  name: string
  map_url: string
  tokens: Token[]
  initiative: Initiative
  created_at: string
}
