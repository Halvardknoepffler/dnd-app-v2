'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('dm')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isSignUp) {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name, role })
        })
        if (res.ok) {
          setIsSignUp(false)
          setEmail('')
          setPassword('')
          setName('')
        }
      } else {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        })
        if (res.ok) {
          const data = await res.json()
          localStorage.setItem('user', JSON.stringify(data))
          router.push('/dm-dashboard')
        }
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a1410 0%, #2d1b0f 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Georgia', serif" }}>
      <div style={{ background: 'linear-gradient(135deg, #3d2817 0%, #2d1b0f 100%)', padding: '40px', borderRadius: '8px', border: '2px solid #d4af37', maxWidth: '400px', width: '100%' }}>
        <h1 style={{ color: '#d4af37', fontFamily: "'Cinzel', serif", fontSize: '28px', marginBottom: '30px', textAlign: 'center' }}>⚔️ D&D</h1>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {isSignUp && (
            <>
              <input
                type="text"
                placeholder="Nom"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ padding: '10px', background: '#1a1410', border: '1px solid #d4af37', color: '#d4af37', borderRadius: '4px' }}
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{ padding: '10px', background: '#1a1410', border: '1px solid #d4af37', color: '#d4af37', borderRadius: '4px' }}
              >
                <option value="dm">Maître du Jeu</option>
                <option value="player">Joueur</option>
              </select>
            </>
          )}
          
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: '10px', background: '#1a1410', border: '1px solid #d4af37', color: '#d4af37', borderRadius: '4px' }}
          />
          
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: '10px', background: '#1a1410', border: '1px solid #d4af37', color: '#d4af37', borderRadius: '4px' }}
          />
          
          <button
            type="submit"
            disabled={loading}
            style={{ padding: '10px', background: 'linear-gradient(135deg, #d4af37 0%, #c49f2e 100%)', color: '#1a1410', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            {loading ? '⏳' : isSignUp ? '✓ S\'INSCRIRE' : '✓ SE CONNECTER'}
          </button>
        </form>
        
        <p style={{ color: '#a89968', textAlign: 'center', marginTop: '20px', cursor: 'pointer' }} onClick={() => setIsSignUp(!isSignUp)}>
          {isSignUp ? 'Déjà inscrit? Se connecter' : 'Pas encore inscrit? S\'inscrire'}
        </p>
      </div>
    </div>
  )
}
