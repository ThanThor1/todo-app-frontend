import { useState } from 'react'
import './App.css'
import Auth from './components/Auth.jsx'
import TodoApp from './components/TodoApp.jsx'

export default function App() {
    const [user, setUser] = useState(null)

    return user
        ? <TodoApp user={user} onLogout={() => setUser(null)} />
        : <Auth onLogin={setUser} />
}