"use client"

import useSWR from "swr"
import {
  listDocuments,
  listDrafts,
  getStats,
  getDocument,
  getDraft,
} from "@/lib/api"

export function useDocuments() {
  const { data, error, mutate } = useSWR("api/v1/documents", listDocuments)
  return {
    documents: data?.documents || [],
    total: data?.total || 0,
    isLoading: !error && !data,
    isError: error,
    mutate,
  }
}

export function useDocument(id: string | null) {
  const { data, error, mutate } = useSWR(
    id ? `api/v1/documents/${id}` : null,
    () => (id ? getDocument(id) : null),
  )
  return {
    document: data,
    isLoading: !error && !data,
    isError: error,
    mutate,
  }
}

export function useDrafts() {
  const { data, error, mutate } = useSWR("api/v1/drafts", listDrafts)
  return {
    drafts: data?.drafts || [],
    total: data?.total || 0,
    isLoading: !error && !data,
    isError: error,
    mutate,
  }
}

export function useDraft(id: string | null) {
  const { data, error, mutate } = useSWR(
    id ? `api/v1/drafts/${id}` : null,
    () => (id ? getDraft(id) : null),
  )
  return {
    draft: data,
    isLoading: !error && !data,
    isError: error,
    mutate,
  }
}

export function useStats() {
  const { data, error, mutate } = useSWR("api/v1/stats", getStats)
  return {
    stats: data,
    isLoading: !error && !data,
    isError: error,
    mutate,
  }
}
