'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Token, Initiative } from '@/types'
import { getTokens, createToken, updateToken, deleteToken, subscribeToTokens } from '@/lib/firebase-functions'
import { getMap, saveMap, subscribeToMap } from '@/lib/firebase-functions'
import { getInitiative, saveInitiative, subscribeToInitiative } from '@/lib/firebase-functions'

export default function BattleMap({ params }: { params: { campaignId: string } }) {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [map, setMap] = useState<any>(null)
  const [tokens, setTokens] = useState<Token[]>([])
  const [initiative, setInitiative] = useState<Initiative | null>(null)
  const [mapFile, setMapFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [zoom, setZoom] = useState(100)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [draggedToken, setDraggedToken] = useState<string | null>(null)
  const [showTokenForm, setShowTokenForm] = useState(false)
  const [selectedTokenType, setSelectedTokenType] = useState<'pj' | 'monstre' | 'pnj'>('pj')
  const [tokenName, setTokenName] = useState('')
  const [tokenImage, setTokenImage] = useState<File | null>(null)
  const [selectedToken, setSelectedToken] = useState<Token | null>(null)
  const [showHPEditor, setShowHPEditor] = useState(false)
  const [newHP, setNewHP] = useState(0)
  const [canvasRef, setCanvasRef] = useState<HTMLDivElement | null>(null)
  const [draggedInitiativeToken, setDraggedInitiativeToken] = useState<string | null>(null)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/login')
      return
    }
    const parsedUser = JSON.parse(userData)
    setUser(parsedUser)
    loadData()
  }, [router, params.campaignId])

  const loadData = async () => {
    const tokensData = await getTokens(params.campaignId)
    setTokens(tokensData)

    const mapData = await getMap(params.campaignId)
    setMap(mapData)

    const initiativeData = await getInitiative(params.campaignId)
    setInitiative(initiativeData)

    subscribeToTokens(params.campaignId, setTokens)
    subscribeToMap(params.campaignId, setMap)
    subscribeToInitiative(params.campaignId, setInitiative)
  }

  const handleMapUpload = async () => {
    if (!mapFile) return

    setUploading(true)
    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64 = e.target?.result as string
        await saveMap(params.campaignId, base64)
        setMessage('✅ Map uploadée!')
        setMapFile(null)
      }
      reader.readAsDataURL(mapFile)
    } catch (err) {
      setMessage('❌ Erreur upload')
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  const handleAddToken = async () => {
    if (!tokenName.trim()) return

    let imageUrl = null
    if (tokenImage) {
      const reader = new FileReader()
      reader.onload = async (e) => {
        imageUrl = e.target?.result as string
        
        const newToken = await createToken(params.campaignId, {
          campaign_id: params.campaignId,
          name: tokenName,
          type: selectedTokenType,
          image_url: imageUrl,
          x: 0,
          y: 0,
          size: 40,
          hp: selectedTokenType === 'pj' ? 20 : 10,
          max_hp: selectedTokenType === 'pj' ? 20 : 10,
          owner_id: selectedTokenType === 'pj' ? user.id : null,
          created_at: new Date().toISOString()
        })

        if (newToken) {
          setMessage('✅ Token créé!')
          setTokenName('')
          setTokenImage(null)
          setShowTokenForm(false)

          if (initiative) {
            const newOrder = [...initiative.token_order, newToken.id]
            await saveInitiative(params.campaignId, newOrder, initiative.current_token_index)
          } else {
            await saveInitiative(params.campaignId, [newToken.id], 0)
          }
        }
      }
      reader.readAsDataURL(tokenImage)
    } else {
      const newToken = await createToken(params.campaignId, {
        campaign_id: params.campaignId,
        name: tokenName,
        type: selectedTokenType,
        image_url: null,
        x: 0,
        y: 0,
        size: 40,
        hp: selectedTokenType === 'pj' ? 20 : 10,
        max_hp: selectedTokenType === 'pj' ? 20 : 10,
        owner_id: selectedTokenType === 'pj' ? user.id : null,
        created_at: new Date().toISOString()
      })

      if (newToken) {
        setMessage('✅ Token créé!')
        setTokenName('')
        setShowTokenForm(false)

        if (initiative) {
          const newOrder = [...initiative.token_order, newToken.id]
          await saveInitiative(params.campaignId, newOrder, initiative.current_token_index)
        } else {
          await saveInitiative(params.campaignId, [newToken.id], 0)
        }
      }
    }
  }

  const handleDeleteToken = async (tokenId: string) => {
    try {
      await deleteToken(params.campaignId, tokenId)
      setSelectedToken(null)

      if (initiative) {
        const newOrder = initiative.token_order.filter(id => id !== tokenId)
        await saveInitiative(params.campaignId, newOrder, 0)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const clampTokenPosition = (x: number, y: number, size: number, canvasWidth: number, canvasHeight: number) => {
    const radius = (size * zoom / 100) / 2
    const minX = -canvasWidth / 2 + radius
    const maxX = canvasWidth / 2 - radius
    const minY = -canvasHeight / 2 + radius
    const maxY = canvasHeight / 2 - radius

    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y))
    }
  }

  const handleTokenMouseDown = (e: React.MouseEvent, tokenId: string) => {
    e.stopPropagation()
    if (user?.role !== 'dm' && user?.id !== tokens.find(t => t.id === tokenId)?.owner_id) return
    setDraggedToken(tokenId)
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleCanvasMouseMove = async (e: React.MouseEvent) => {
    if (isDragging && !draggedToken) {
      setOffsetX(offsetX + (e.clientX - dragStart.x))
      setOffsetY(offsetY + (e.clientY - dragStart.y))
      setDragStart({ x: e.clientX, y: e.clientY })
    }

    if (draggedToken && canvasRef) {
      const token = tokens.find(t => t.id === draggedToken)
      if (!token) return

      if (user?.role !== 'dm' && user?.id !== token.owner_id) return

      const rect = canvasRef.getBoundingClientRect()
      const centerX = rect.width / 2
      const centerY = rect.height / 2

      let newX = e.clientX - rect.left - centerX - offsetX
      let newY = e.clientY - rect.top - centerY - offsetY

      const clamped = clampTokenPosition(newX, newY, token.size, rect.width, rect.height)

      try {
        await updateToken(params.campaignId, draggedToken, {
          x: clamped.x,
          y: clamped.y
        })

        setTokens(tokens.map(t => t.id === draggedToken ? { ...t, x: clamped.x, y: clamped.y } : t))
      } catch (err) {
        console.error(err)
      }
    }
  }

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (!draggedToken) {
      setIsDragging(true)
      setDragStart({ x: e.clientX, y: e.clientY })
    }
  }

  const handleCanvasMouseUp = () => {
    setIsDragging(false)
    setDraggedToken(null)
  }

  const handleZoom = (delta: number) => {
    setZoom(Math.max(50, Math.min(300, zoom + delta)))
  }

  const handleUpdateHP = async () => {
    if (!selectedToken) return

    try {
      await updateToken(params.campaignId, selectedToken.id, { hp: newHP })
      const updatedTokens = tokens.map(t => t.id === selectedToken.id ? { ...t, hp: newHP } : t)
      setTokens(updatedTokens)
      setSelectedToken({ ...selectedToken, hp: newHP })
      setShowHPEditor(false)
    } catch (err) {
      console.error(err)
    }
  }

  const handleResizeToken = async (tokenId: string, newSize: number) => {
    if (newSize < 20 || newSize > 100) return

    try {
      await updateToken(params.campaignId, tokenId, { size: newSize })
      const updatedTokens = tokens.map(t => t.id === tokenId ? { ...t, size: newSize } : t)
      setTokens(updatedTokens)
      if (selectedToken?.id === tokenId) {
        setSelectedToken({ ...selectedToken, size: newSize })
      }
    } catch (err) {
      console.error(err)
    }
  }

  const saveInitiativeData = async (tokenOrder: string[], currentIndex: number) => {
    try {
      const result = await saveInitiative(params.campaignId, tokenOrder, currentIndex)
      setInitiative(result)
    } catch (err) {
      console.error(err)
    }
  }

  const handleNextTurn = () => {
    if (!initiative || initiative.token_order.length === 0) return

    let nextIndex = initiative.current_token_index + 1
    if (nextIndex >= initiative.token_order.length) {
      nextIndex = 0
    }

    saveInitiativeData(initiative.token_order, nextIndex)
  }

  const handleReorderInitiative = (fromIndex: number, toIndex: number) => {
    if (!initiative) return

    const newOrder = [...initiative.token_order]
    const [removed] = newOrder.splice(fromIndex, 1)
    newOrder.splice(toIndex, 0, removed)

    saveInitiativeData(newOrder, initiative.current_token_index)
  }

  const currentToken = initiative && initiative.token_order.length > 0 
    ? tokens.find(t => t.id === initiative.token_order[initiative.current_token_index])
    : null

  const isDM = user?.role === 'dm'

  if (!user) return <div style={{ background: '#1a1410', color: '#d4af37', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Georgia', serif" }}>Chargement...</div>

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a1410 0%, #2d1b0f 100%)', color: '#d4af37', padding: '20px', display: 'flex', gap: '20px', fontFamily: "'Georgia', serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;900&display=swap');
        
        button {
          transition: all 0.3s ease;
        }
        
        button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(212, 175, 55, 0.3);
        }
        
        input, select {
          transition: border-color 0.3s ease;
        }
        
        input:focus, select:focus {
          outline: none;
          border-color: #d4af37 !important;
          box-shadow: 0 0 8px rgba(212, 175, 55, 0.3);
        }
      `}</style>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h1 style={{ fontSize: '42px', marginBottom: '5px', fontFamily: "'Cinzel', serif", fontWeight: 900, textShadow: '0 2px 10px rgba(212, 175, 55, 0.3)' }}>⚔️ BATTLE MAP ⚔️</h1>
        <p style={{ color: '#a89968', marginBottom: '20px', fontSize: '14px', letterSpacing: '2px' }}>CAMPAGNE: {params.campaignId.toUpperCase()}</p>

        {isDM && (
          <div style={{ background: 'linear-gradient(135deg, #3d2817 0%, #2d1b0f 100%)', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '2px solid #d4af37' }}>
            <h3 style={{ marginBottom: '10px', color: '#d4af37', fontFamily: "'Cinzel', serif" }}>📜 IMPORTER CARTE</h3>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setMapFile(e.target.files?.[0] || null)}
              style={{ marginBottom: '10px', color: '#d4af37', background: '#1a1410', border: '1px solid #d4af37', padding: '8px', borderRadius: '4px', width: '100%', boxSizing: 'border-box' }}
            />
            <button
              onClick={handleMapUpload}
              disabled={!mapFile || uploading}
              style={{ padding: '10px 16px', background: 'linear-gradient(135deg, #d4af37 0%, #c49f2e 100%)', color: '#1a1410', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontFamily: "'Cinzel', serif" }}
            >
              {uploading ? '⏳ UPLOAD...' : '📤 UPLOADER CARTE'}
            </button>
            {message && <p style={{ marginTop: '10px', color: '#ff6b6b' }}>{message}</p>}
          </div>
        )}

        <div style={{ background: 'linear-gradient(135deg, #3d2817 0%, #2d1b0f 100%)', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '2px solid #d4af37' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button onClick={() => handleZoom(-10)} style={{ padding: '8px 12px', background: 'linear-gradient(135deg, #8b6914 0%, #6b5410 100%)', color: '#d4af37', border: '1px solid #d4af37', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>−</button>
            <span style={{ color: '#d4af37', minWidth: '60px', textAlign: 'center', fontWeight: 'bold' }}>{zoom}%</span>
            <button onClick={() => handleZoom(10)} style={{ padding: '8px 12px', background: 'linear-gradient(135deg, #8b6914 0%, #6b5410 100%)', color: '#d4af37', border: '1px solid #d4af37', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
            <button onClick={() => { setZoom(100); setOffsetX(0); setOffsetY(0) }} style={{ padding: '8px 12px', background: 'linear-gradient(135deg, #8b6914 0%, #6b5410 100%)', color: '#d4af37', border: '1px solid #d4af37', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>🔄</button>
            {isDM && <button onClick={() => setShowTokenForm(!showTokenForm)} style={{ padding: '8px 12px', background: 'linear-gradient(135deg, #c92a2a 0%, #9c0a0a 100%)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontFamily: "'Cinzel', serif" }}>⚔️ TOKEN</button>}
          </div>
        </div>

        {showTokenForm && isDM && (
          <div style={{ background: 'linear-gradient(135deg, #3d2817 0%, #2d1b0f 100%)', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '2px solid #c92a2a' }}>
            <h3 style={{ marginBottom: '10px', color: '#c92a2a', fontFamily: "'Cinzel', serif" }}>⚔️ CRÉER PION</h3>
            <select value={selectedTokenType} onChange={(e) => setSelectedTokenType(e.target.value as any)} style={{ width: '100%', padding: '8px', background: '#1a1410', border: '1px solid #d4af37', borderRadius: '4px', color: '#d4af37', marginBottom: '10px', boxSizing: 'border-box', fontFamily: "'Georgia', serif" }}>
              <option value="pj">PERSONNAGE</option>
              <option value="monstre">MONSTRE</option>
              <option value="pnj">PNJ</option>
            </select>
            <input type="text" value={tokenName} onChange={(e) => setTokenName(e.target.value)} placeholder="Nom du pion..." style={{ width: '100%', padding: '8px', background: '#1a1410', border: '1px solid #d4af37', borderRadius: '4px', color: '#d4af37', marginBottom: '10px', boxSizing: 'border-box' }} />
            <input type="file" accept="image/*" onChange={(e) => setTokenImage(e.target.files?.[0] || null)} style={{ marginBottom: '10px', color: '#d4af37' }} />
            <button onClick={handleAddToken} style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #d4af37 0%, #c49f2e 100%)', color: '#1a1410', border: 'none', borderRadius: '4px', cursor: 'pointer', width: '100%', fontWeight: 'bold', fontFamily: "'Cinzel', serif" }}>✓ CRÉER</button>
          </div>
        )}

        <div 
          ref={setCanvasRef}
          style={{ flex: 1, background: 'linear-gradient(135deg, #3d2817 0%, #1a1410 100%)', borderRadius: '8px', overflow: 'hidden', cursor: isDragging ? 'grabbing' : 'grab', position: 'relative', border: '3px solid #d4af37', boxShadow: '0 0 30px rgba(212, 175, 55, 0.2) inset' }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
        >
          {map?.map_url ? (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1410', position: 'relative' }}>
              <img
                src={map.map_url}
                alt="Battle Map"
                style={{ 
                  width: `${zoom}%`,
                  height: 'auto',
                  borderRadius: '6px',
                  transform: `translate(${offsetX}px, ${offsetY}px)`,
                  userSelect: 'none',
                  pointerEvents: 'none',
                  filter: 'brightness(0.9)'
                }}
              />
              {tokens.map(token => {
                const isCurrentTurn = currentToken?.id === token.id
                return (
                  <div
                    key={token.id}
                    onMouseDown={(e) => handleTokenMouseDown(e, token.id)}
                    onClick={(e) => { e.stopPropagation(); setSelectedToken(token); setNewHP(token.hp); setShowHPEditor(false) }}
                    style={{
                      position: 'absolute',
                      left: `calc(50% + ${token.x + offsetX}px)`,
                      top: `calc(50% + ${token.y + offsetY}px)`,
                      transform: 'translate(-50%, -50%)',
                      cursor: (isDM || user?.id === token.owner_id) ? 'grab' : 'pointer',
                      zIndex: selectedToken?.id === token.id ? 100 : 10
                    }}
                  >
                    <div
                      style={{
                        position: 'relative',
                        width: `${token.size * zoom / 100}px`,
                        height: `${token.size * zoom / 100}px`,
                        background: token.image_url ? `url(${token.image_url})` : 'linear-gradient(135deg, #c92a2a 0%, #7a0a0a 100%)',
                        backgroundSize: 'cover',
                        borderRadius: '50%',
                        border: selectedToken?.id === token.id ? '3px solid #d4af37' : '2px solid #d4af37',
                        boxShadow: isCurrentTurn ? '0 0 30px 3px #d4af37, inset 0 0 20px rgba(212, 175, 55, 0.4)' : 'inset 0 0 10px rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <p style={{ color: '#d4af37', fontWeight: 'bold', fontSize: `${Math.max(8, token.size * zoom / 100 / 4)}px`, margin: 0, textAlign: 'center', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                        {token?.name?.toUpperCase() || 'PION'}
                      </p>
                    </div>

                    {token.type === 'pj' && (
                      <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '8px', color: '#ff1744', fontWeight: 'bold', fontSize: '12px', whiteSpace: 'nowrap', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                        ❤️ {token.hp}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ width: '100%', height: '100%', background: '#1a1410', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ color: '#a89968', fontSize: '20px', fontFamily: "'Cinzel', serif" }}>📜 AUCUNE CARTE</p>
            </div>
          )}
        </div>
      </div>

      <div style={{ width: '340px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {selectedToken && (
          <div style={{ background: 'linear-gradient(135deg, #3d2817 0%, #2d1b0f 100%)', padding: '15px', borderRadius: '8px', border: '2px solid #d4af37' }}>
            <h3 style={{ marginBottom: '10px', color: '#d4af37', fontFamily: "'Cinzel', serif", fontSize: '18px', textShadow: '0 2px 5px rgba(0,0,0,0.5)' }}>{selectedToken?.name?.toUpperCase() || 'PION'}</h3>
            <p style={{ color: '#a89968', marginBottom: '10px', fontSize: '12px', letterSpacing: '1px' }}>{selectedToken.type === 'pj' ? 'PERSONNAGE' : selectedToken.type === 'monstre' ? 'MONSTRE' : 'PNJ'}</p>
            
            {selectedToken.type === 'pj' && (
              <div style={{ marginBottom: '15px' }}>
                <p style={{ color: '#ff1744', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px', letterSpacing: '1px' }}>❤️ PV: {selectedToken.hp}</p>
                {(isDM || user?.id === selectedToken.owner_id) && (
                  <>
                    <button onClick={() => setShowHPEditor(!showHPEditor)} style={{ padding: '6px 12px', background: 'linear-gradient(135deg, #c92a2a 0%, #9c0a0a 100%)', color: '#fff', border: '1px solid #ff1744', borderRadius: '4px', cursor: 'pointer', width: '100%', fontSize: '12px', fontWeight: 'bold', fontFamily: "'Cinzel', serif", marginBottom: '10px' }}>
                      ⚕️ MODIFIER
                    </button>
                    {showHPEditor && (
                      <div style={{ marginBottom: '10px' }}>
                        <input type="number" value={newHP} onChange={(e) => setNewHP(parseInt(e.target.value))} style={{ width: '100%', padding: '6px', background: '#1a1410', border: '1px solid #d4af37', borderRadius: '4px', color: '#d4af37', marginBottom: '8px', boxSizing: 'border-box', fontSize: '12px' }} />
                        <button onClick={handleUpdateHP} style={{ padding: '6px 12px', background: 'linear-gradient(135deg, #d4af37 0%, #c49f2e 100%)', color: '#1a1410', border: 'none', borderRadius: '4px', cursor: 'pointer', width: '100%', fontWeight: 'bold' }}>✓ VALIDER</button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {(isDM || user?.id === selectedToken.owner_id) && (
              <div style={{ marginBottom: '15px' }}>
                <p style={{ color: '#a89968', marginBottom: '5px', fontSize: '12px', letterSpacing: '1px' }}>⚔️ TAILLE: {selectedToken.size}px</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleResizeToken(selectedToken.id, selectedToken.size - 5)} style={{ padding: '6px', background: 'linear-gradient(135deg, #8b6914 0%, #6b5410 100%)', color: '#d4af37', border: '1px solid #d4af37', borderRadius: '4px', cursor: 'pointer', flex: 1, fontWeight: 'bold' }}>−</button>
                  <button onClick={() => handleResizeToken(selectedToken.id, selectedToken.size + 5)} style={{ padding: '6px', background: 'linear-gradient(135deg, #8b6914 0%, #6b5410 100%)', color: '#d4af37', border: '1px solid #d4af37', borderRadius: '4px', cursor: 'pointer', flex: 1, fontWeight: 'bold' }}>+</button>
                </div>
              </div>
            )}

            {isDM && (
              <button onClick={() => handleDeleteToken(selectedToken.id)} style={{ padding: '8px 12px', background: 'linear-gradient(135deg, #c92a2a 0%, #9c0a0a 100%)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', width: '100%', fontWeight: 'bold', fontFamily: "'Cinzel', serif" }}>🔥 DÉTRUIRE</button>
            )}
          </div>
        )}

        {isDM && (
          <div style={{ background: 'linear-gradient(135deg, #3d2817 0%, #2d1b0f 100%)', padding: '15px', borderRadius: '8px', flex: 1, display: 'flex', flexDirection: 'column', border: '2px solid #d4af37' }}>
            <h3 style={{ marginBottom: '10px', color: '#d4af37', fontSize: '18px', fontFamily: "'Cinzel', serif", textShadow: '0 2px 5px rgba(0,0,0,0.5)' }}>⚔️ INITIATIVE ⚔️</h3>
            
            {currentToken && (
              <div style={{ background: 'linear-gradient(135deg, #d4af37 0%, #c49f2e 100%)', padding: '10px', borderRadius: '6px', marginBottom: '10px', color: '#1a1410', fontSize: '13px', fontWeight: 'bold', fontFamily: "'Cinzel', serif", textAlign: 'center', textShadow: '0 1px 3px rgba(0,0,0,0.3)', border: '2px solid #1a1410' }}>
              ⚡ {currentToken?.name?.toUpperCase() || 'PION'} EN ACTION
            </div>
            )}

            <div style={{ flex: 1, overflow: 'auto', marginBottom: '10px', border: '2px solid #d4af37', borderRadius: '6px', padding: '10px', background: '#1a1410' }}>
              {initiative && initiative.token_order.length > 0 ? (
                initiative.token_order.map((tokenId, index) => {
                  const token = tokens.find(t => t.id === tokenId)
                  if (!token) return null
                  const isActive = index === initiative.current_token_index

                  return (
                    <div
                      key={tokenId}
                      draggable
                      onDragStart={() => setDraggedInitiativeToken(tokenId)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        const fromIndex = initiative.token_order.indexOf(draggedInitiativeToken || '')
                        if (fromIndex >= 0) {
                          handleReorderInitiative(fromIndex, index)
                          setDraggedInitiativeToken(null)
                        }
                      }}
                      style={{ 
                        padding: '10px',
                        marginBottom: '6px',
                        background: isActive ? 'linear-gradient(135deg, #d4af37 0%, #c49f2e 100%)' : '#2d1b0f',
                        border: isActive ? '2px solid #1a1410' : '1px solid #d4af37',
                        borderRadius: '4px',
                        cursor: 'grab',
                        color: isActive ? '#1a1410' : '#d4af37',
                        fontWeight: isActive ? 'bold' : 'normal',
                        fontSize: '13px',
                        userSelect: 'none',
                        fontFamily: "'Cinzel', serif",
                        textShadow: isActive ? '0 1px 3px rgba(0,0,0,0.3)' : 'none'
                      }}
                    >
                      {index + 1}. {token?.name?.toUpperCase() || 'PION'}
                    </div>
                  )
                })
              ) : (
                <p style={{ fontSize: '12px', color: '#a89968' }}>Aucun pion</p>
              )}
            </div>

            <button 
              onClick={handleNextTurn} 
              style={{ 
                padding: '12px',
                background: 'linear-gradient(135deg, #d4af37 0%, #c49f2e 100%)',
                color: '#1a1410',
                border: '2px solid #1a1410',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px',
                width: '100%',
                fontFamily: "'Cinzel', serif",
                textShadow: '0 1px 3px rgba(0,0,0,0.3)',
                letterSpacing: '1px'
              }}
            >
              ➡️ TOUR SUIVANT
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
