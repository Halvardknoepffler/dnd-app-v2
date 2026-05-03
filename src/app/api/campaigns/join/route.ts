import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'data', 'db.json')

function readDB() {
  const data = fs.readFileSync(DB_PATH, 'utf-8')
  return JSON.parse(data)
}

function writeDB(data: any) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
}

export async function POST(req: NextRequest) {
  try {
    const { userId, code } = await req.json()

    if (!userId || !code) {
      return NextResponse.json({ error: 'User ID and code required' }, { status: 400 })
    }

    const db = readDB()
    const campaign = db.campaigns.find((c: any) => c.code === code)

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const newMember = {
      id: Math.random().toString(36).substring(7),
      userId,
      campaignId: campaign.id,
      joinedAt: new Date().toISOString()
    }

    db.members.push(newMember)
    writeDB(db)

    return NextResponse.json({ ...newMember, campaign }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to join campaign' }, { status: 500 })
  }
}
