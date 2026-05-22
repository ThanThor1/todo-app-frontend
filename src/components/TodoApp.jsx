import { useState, useEffect, useCallback } from 'react'

const API = 'http://localhost:8081'

const STATUSES = ['TODO', 'IN_PROGRESS', 'DONE']
const STATUS_LABEL = {
    TODO: 'Chờ xử lý',
    IN_PROGRESS: 'Đang làm',
    DONE: 'Hoàn thành',
}

function headers(token) {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    }
}

export default function TodoApp({ user, onLogout }) {
    const [tasks, setTasks] = useState([])
    const [loading, setLoading] = useState(true)
    const [newTitle, setNewTitle] = useState('')
    const [newStatus, setNewStatus] = useState('TODO')
    const [creating, setCreating] = useState(false)
    const [alert, setAlert] = useState(null)
    const [animatingTaskIds, setAnimatingTaskIds] = useState([])

    const flash = (type, msg) => {
        setAlert({ type, msg })
        setTimeout(() => setAlert(null), 3000)
    }

    const fetchTasks = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch(`${API}/api/tasks`, {
                headers: headers(user.token),
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const data = await res.json()
            setTasks(data)
        } catch (err) {
            flash('error', 'Không thể tải danh sách task: ' + err.message)
        } finally {
            setLoading(false)
        }
    }, [user.userId])

    useEffect(() => {
        fetchTasks()
    }, [fetchTasks])

    const handleCreate = async (e) => {
        e.preventDefault()
        if (!newTitle.trim()) return
        setCreating(true)
        try {
            const res = await fetch(`${API}/api/tasks`, {
                method: 'POST',
                headers: headers(user.token),
                body: JSON.stringify({ title: newTitle.trim(), status: newStatus }),
            })
            if (!res.ok) {
                const msg = await res.text()
                throw new Error(msg || `HTTP ${res.status}`)
            }
            const created = await res.json()
            setTasks(prev => [created, ...prev])
            setNewTitle('')
            setNewStatus('TODO')
            flash('success', 'Đã tạo task mới.')
        } catch (err) {
            flash('error', 'Tạo task thất bại: ' + err.message)
        } finally {
            setCreating(false)
        }
    }

    const handleStatusChange = async (taskId, nextStatus) => {
        const current = tasks.find(t => t.id === taskId)
        if (!current || current.status === nextStatus) return

        setAnimatingTaskIds(prev => [...prev, taskId])

        // cập nhật UI ngay để user thấy task "bay" sang cột đích
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: nextStatus } : t))

        window.setTimeout(async () => {
            try {
                const res = await fetch(
                    `${API}/api/tasks/${taskId}/status?newStatus=${nextStatus}`,
                    { method: 'PUT', headers: headers(user.token) }
                )
                if (!res.ok) {
                    const msg = await res.text()
                    throw new Error(msg || `HTTP ${res.status}`)
                }
                const updated = await res.json()
                setTasks(prev => prev.map(t => t.id === taskId ? updated : t))
            } catch (err) {
                flash('error', 'Cập nhật thất bại: ' + err.message)
                fetchTasks()
            } finally {
                window.setTimeout(() => {
                    setAnimatingTaskIds(prev => prev.filter(id => id !== taskId))
                }, 220)
            }
        }, 180)
    }

    const handleDelete = async (taskId) => {
        if (!window.confirm('Xóa task này?')) return
        setTasks(prev => prev.filter(t => t.id !== taskId))
        try {
            const res = await fetch(`${API}/api/tasks/${taskId}`, {
                method: 'DELETE',
                headers: headers(user.token),
            })
            if (!res.ok) {
                const msg = await res.text()
                throw new Error(msg || `HTTP ${res.status}`)
            }
            flash('success', 'Đã xóa task.')
        } catch (err) {
            flash('error', 'Xóa thất bại: ' + err.message)
            fetchTasks()
        }
    }

    const todoTasks = tasks.filter(t => t.status === 'TODO')
    const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS')
    const doneTasks = tasks.filter(t => t.status === 'DONE')

    const renderTaskCard = (task) => {
        const motionClass =
            task.status === 'TODO' ? 'fly-right' :
                task.status === 'DONE' ? 'fly-left' :
                    'fly-neutral'

        return (
            <div
                key={task.id}
                className={`task-card ${motionClass} ${animatingTaskIds.includes(task.id) ? 'is-animating' : ''}`}
                data-status={task.status}
            >
                <div className="task-card-body">
                    <div className="task-card-top">
                        <span className="task-id">#{task.id}</span>
                        <span className={`task-badge badge-${task.status}`}>
                            {STATUS_LABEL[task.status] ?? task.status}
                        </span>
                    </div>

                    <div className="task-title" title={task.title}>
                        {task.title}
                    </div>
                    <div className="task-card-actions">
                        <div className="move-row">
                            {task.status === 'TODO' && (
                                <button
                                    className="move-btn visible"
                                    onClick={() => handleStatusChange(task.id, 'IN_PROGRESS')}
                                >
                                    →
                                </button>
                            )}

                            {task.status === 'IN_PROGRESS' && (
                                <>
                                    <button
                                        className="move-btn visible"
                                        onClick={() => handleStatusChange(task.id, 'TODO')}
                                    >
                                        ←
                                    </button>
                                    <button
                                        className="move-btn visible"
                                        onClick={() => handleStatusChange(task.id, 'DONE')}
                                    >
                                        →
                                    </button>
                                </>
                            )}

                            {task.status === 'DONE' && (
                                <button
                                    className="move-btn visible"
                                    onClick={() => handleStatusChange(task.id, 'IN_PROGRESS')}
                                >
                                    ←
                                </button>
                            )}
                        </div>

                        <button
                            className="btn-delete"
                            onClick={() => handleDelete(task.id)}
                        >
                            Xóa
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    const renderColumn = (title, className, list) => (
        <div className="kanban-column">
            <div className={`kanban-column-head ${className}`}>
                {title} ({list.length})
            </div>

            <div className="kanban-list">
                {list.length === 0 ? (
                    <div className="state-msg">
                        <span className="icon">◈</span>
                        Chưa có task nào
                    </div>
                ) : (
                    list.map(renderTaskCard)
                )}
            </div>
        </div>
    )

    return (
        <div className="app-root">
            {alert && (
                <div className={`global-alert ${alert.type}`}>
                    {alert.msg}
                </div>
            )}

            <header className="topbar">
                <div className="topbar-brand">
                    Task<em>flow</em>
                </div>

                <div className="topbar-right">
                    <div className="topbar-user">
                        Xin chào, <span>{user.username}</span>
                    </div>
                    <button className="btn-logout" onClick={onLogout}>
                        Đăng xuất
                    </button>
                </div>
            </header>

            <main className="main-content">
                <div className="stats-row">
                    <div className="stat-cell">
                        <div className="stat-val dim">{tasks.length}</div>
                        <div className="stat-lbl">Tổng</div>
                    </div>
                    <div className="stat-cell">
                        <div className="stat-val gold">{todoTasks.length}</div>
                        <div className="stat-lbl">Chờ xử lý</div>
                    </div>
                    <div className="stat-cell">
                        <div className="stat-val blue">{inProgressTasks.length}</div>
                        <div className="stat-lbl">Đang làm</div>
                    </div>
                    <div className="stat-cell">
                        <div className="stat-val green">{doneTasks.length}</div>
                        <div className="stat-lbl">Hoàn thành</div>
                    </div>
                </div>

                <section className="create-section">
                    <div className="section-label">Thêm task mới</div>
                    <form className="create-form" onSubmit={handleCreate}>
                        <input
                            className="create-input"
                            type="text"
                            placeholder="Nhập tên công việc…"
                            value={newTitle}
                            onChange={e => setNewTitle(e.target.value)}
                            maxLength={255}
                        />

                        <select
                            className="create-status-select"
                            value={newStatus}
                            onChange={e => setNewStatus(e.target.value)}
                        >
                            {STATUSES.map(s => (
                                <option key={s} value={s}>
                                    {STATUS_LABEL[s]}
                                </option>
                            ))}
                        </select>

                        <button
                            className="create-btn"
                            type="submit"
                            disabled={creating || !newTitle.trim()}
                        >
                            {creating ? 'Đang thêm…' : '+ Thêm'}
                        </button>
                    </form>
                </section>

                <section className="tasks-section">
                    <div className="section-label">Bảng Kanban 3 cột</div>

                    {loading ? (
                        <div style={{ display: 'grid', gap: 12 }}>
                            {[1, 2, 3].map(i => (
                                <div
                                    key={i}
                                    className="shimmer"
                                    style={{ animationDelay: `${i * 0.1}s` }}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="kanban-board">
                            {renderColumn('Chờ xử lý', 'todo', todoTasks)}
                            {renderColumn('Đang làm', 'progress', inProgressTasks)}
                            {renderColumn('Hoàn thành', 'done', doneTasks)}
                        </div>
                    )}
                </section>
            </main>
        </div>
    )
}