import { useState } from 'react'

const API = 'http://localhost:8081'

export default function Auth({ onLogin }) {
    const [mode, setMode] = useState('login')
    const [form, setForm] = useState({ username: '', password: '' })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.username.trim() || !form.password.trim()) {
            setError('Vui lòng điền đầy đủ thông tin.')
            return
        }
        setError(''); setSuccess(''); setLoading(true)
        try {
            const res = await fetch(`${API}/api/auth/${mode}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: form.username.trim(), password: form.password })
            })

            const text = await res.text()

            // Try to parse JSON (updated backend), fall back to plain string
            let data = {}
            try { data = JSON.parse(text) } catch { data = { message: text } }

            if (!res.ok) {
                setError(data.message || text)
                return
            }

            if (mode === 'register') {
                setSuccess('Đăng ký thành công! Hãy đăng nhập.')
                setMode('login')
                setForm(f => ({ ...f, password: '' }))
                return
            }

            // ── Login success ──
            // Backend needs to return: { userId, username, message }
            // See README in outputs for the required AuthController change
            if (!data.token) {
                setError('Đăng nhập thất bại, không nhận được token.')
                return
            }
            onLogin({ token: data.token, username: data.username || form.username })

        } catch {
            setError('Không kết nối được server. Kiểm tra backend đang chạy ở localhost:8081')
        } finally {
            setLoading(false)
        }
    }

    const switchMode = (m) => {
        if (m === mode) return
        setMode(m); setError(''); setSuccess('')
    }

    return (
        <div className="auth-root">
            <div className="auth-bg-lines" />

            <div className="auth-card">
                {/* Gold top line via CSS ::before */}

                <div className="auth-header">
                    <div className="auth-logo">
                        Task<em>flow</em>
                    </div>
                    <div className="auth-tagline">personal task management</div>
                </div>

                <div className="auth-tabs">
                    <button
                        className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
                        onClick={() => switchMode('login')}
                    >
                        Đăng nhập
                    </button>
                    <button
                        className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
                        onClick={() => switchMode('register')}
                    >
                        Đăng ký
                    </button>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    {error && (
                        <div className="auth-alert error" style={{ whiteSpace: 'pre-line' }}>
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="auth-alert success">{success}</div>
                    )}

                    <div className="field-group">
                        <label className="field-label">Tên đăng nhập</label>
                        <input
                            className="field-input"
                            type="text"
                            placeholder="username"
                            value={form.username}
                            onChange={set('username')}
                            autoComplete="username"
                            autoFocus
                        />
                    </div>

                    <div className="field-group">
                        <label className="field-label">Mật khẩu</label>
                        <input
                            className="field-input"
                            type="password"
                            placeholder="••••••••"
                            value={form.password}
                            onChange={set('password')}
                            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        />
                    </div>

                    <button className="auth-submit" type="submit" disabled={loading}>
                        {loading && <span className="spinner" />}
                        {loading
                            ? (mode === 'login' ? 'Đang đăng nhập…' : 'Đang đăng ký…')
                            : (mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản')
                        }
                    </button>
                </form>
            </div>
        </div>
    )
}