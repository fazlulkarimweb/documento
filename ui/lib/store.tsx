"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import type { StoredDocument, StoredDraft } from "./types"

interface StoreState {
  documents: StoredDocument[]
  drafts: StoredDraft[]
  addDocument: (doc: StoredDocument) => void
  addDraft: (draft: StoredDraft) => void
  updateDraft: (id: string, patch: Partial<StoredDraft>) => void
}

const StoreContext = createContext<StoreState | null>(null)

const KEY = "psl-store-v1"

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [documents, setDocuments] = useState<StoredDocument[]>([])
  const [drafts, setDrafts] = useState<StoredDraft[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        setDocuments(parsed.documents || [])
        setDrafts(parsed.drafts || [])
      }
    } catch {}
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(KEY, JSON.stringify({ documents, drafts }))
  }, [documents, drafts, hydrated])

  const addDocument = useCallback(
    (doc: StoredDocument) => setDocuments((d) => [doc, ...d]),
    [],
  )
  const addDraft = useCallback(
    (draft: StoredDraft) => setDrafts((d) => [draft, ...d]),
    [],
  )
  const updateDraft = useCallback(
    (id: string, patch: Partial<StoredDraft>) =>
      setDrafts((d) =>
        d.map((x) => (x.draft_id === id ? { ...x, ...patch } : x)),
      ),
    [],
  )

  const value = useMemo(
    () => ({
      documents,
      drafts,
      addDocument,
      addDraft,
      updateDraft,
    }),
    [documents, drafts, addDocument, addDraft, updateDraft],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error("useStore must be used within StoreProvider")
  return ctx
}
