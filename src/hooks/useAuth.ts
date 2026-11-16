import { useSyncExternalStore } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from '../apis/firebase'

let snapshot: { user: User | null; loading: boolean } = { user: null, loading: Boolean(auth) }
const listeners = new Set<() => void>()
if (auth) onAuthStateChanged(auth, user => { snapshot = { user, loading: false }; listeners.forEach(listener => listener()) })
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
export const useAuth = () => useSyncExternalStore(subscribe, () => snapshot)
