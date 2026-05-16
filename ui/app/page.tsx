"use client"

import useSWR from "swr"
import Link from "next/link"
import {
  FileText,
  FileStack,
  Wrench,
  ArrowRight,
  ShieldCheck,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DocumentUploader } from "@/components/document-uploader"
import { useDocuments, useDrafts, useStats } from "@/hooks/use-api"
import { isMock } from "@/lib/api"
import { useRouter } from "next/navigation"

export default function DashboardPage() {
  const { documents } = useDocuments()
  const { drafts } = useDrafts()
  const { stats: apiStats } = useStats()
  const router = useRouter()

  const stats = [
    {
      label: "Documents Ingested",
      value: apiStats?.documents ?? documents.length,
      icon: FileText,
      href: "/documents",
    },
    {
      label: "Drafts Generated",
      value: apiStats?.drafts ?? drafts.length,
      icon: FileStack,
      href: "/drafts",
    },
    {
      label: "Skills",
      value: apiStats?.skills ?? 0,
      icon: Wrench,
      href: "/skills",
    },
  ]

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-8 py-8 md:py-12">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="gap-1">
              <ShieldCheck className="h-3 w-3" />
              {isMock ? "Mock mode" : "Connected to backend"}
            </Badge>
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-balance">
            Process messy legal documents with grounded AI.
          </h1>
          <p className="mt-2 text-muted-foreground text-pretty max-w-2xl">
            Ingest scanned PDFs and handwritten notes, extract structured
            evidence, generate citation-anchored drafts, and improve with every
            edit.
          </p>
        </div>
        <Button asChild>
          <Link href="/drafts/new">
            New Draft
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <Link key={s.label} href={s.href}>
              <Card className="hover:border-primary/40 transition-colors">
                <CardContent className="flex items-center justify-between p-6">
                  <div>
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                    <p className="text-3xl font-semibold mt-1">{s.value}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Ingest Document</CardTitle>
          </CardHeader>
          <CardContent>
            <DocumentUploader
              onIngested={(id) => router.push(`/documents/${id}`)}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Drafts</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/drafts">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {drafts.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No drafts yet. Ingest a document and generate your first draft.
              </p>
            )}
            {drafts.slice(0, 5).map((d) => (
              <Link
                key={d.draft_id}
                href={`/drafts/${d.draft_id}`}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 hover:bg-accent transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {d.draft_type}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {new Date(d.created_at).toLocaleString()}
                  </p>
                </div>
                <Badge variant="secondary" className="ml-2 shrink-0">
                  {(d.grounding_score * 100).toFixed(0)}%
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
