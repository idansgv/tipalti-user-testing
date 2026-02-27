import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Label, Btn } from '../../components/UI'

// Simple client-side admin password gate.
// For production, move this to a server-side check.
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123'

export default function AdminLogin() {
  const [pw, setPw]       = useState('')
  const [error, setError] = useState('')
  const navigate          = useNavigate()

  function handleLogin(e) {
    e.preventDefault()
    if (pw === ADMIN_PASSWORD) {
      sessionStorage.setItem('admin_authed', '1')
      navigate('/admin/dashboard')
    } else {
      setError('Incorrect password')
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="font-mono text-[10px] tracking-widest uppercase text-accent mb-2">
            Admin
          </div>
          <h1 className="text-xl font-semibold tracking-tight">User Testing Tool</h1>
        </div>

        <Card>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <Label className="mb-2 block">Password</Label>
              <input
                type="password"
                value={pw}
                onChange={e => { setPw(e.target.value); setError('') }}
                className="w-full bg-bg border border-border rounded-md px-3 py-2
                  text-sm text-text placeholder-muted focus:outline-none
                  focus:border-accent/50 transition-colors font-mono"
                placeholder="Enter admin password"
                autoFocus
              />
              {error && (
                <p className="text-warn text-xs mt-1.5 font-mono">{error}</p>
              )}
            </div>
            <Btn className="w-full">Enter →</Btn>
          </form>
        </Card>
      </div>
    </div>
  )
}
