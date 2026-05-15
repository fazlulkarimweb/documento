"use client"

import { use } from "react"
import Link from "next/link"
import { ArrowLeft, FileText, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useStore } from "@/lib/store"
import { notFound } from "next/navigation"

export default function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { documents } = useStore()
  const doc = documents.find((d) => d.document_id === id)

  if (!doc) {
    return (
      <div className="mx-auto max-w-4xl px-4 md:px-8 py-8 md:py-12">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link href="/documents">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Document not found. It may have been ingested in a different
            session.
          </CardContent>
        </Card>
      </div>
    )
  }

  const chunks = Object.entries(doc.chunks)

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-8 py-8 md:py-12">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/documents">
          <ArrowLeft className="h-4 w-4" />
          All documents
        </Link>
      </Button>

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-muted">
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight truncate">
              {doc.metadata.filename}
            </h1>
            <p className="text-xs text-muted-foreground mt-1 font-mono break-all">
              {doc.document_id}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant="secondary">
                {doc.metadata.page_count} pages
              </Badge>
              <Badge variant="outline">{chunks.length} chunks</Badge>
              <Badge variant="outline">
                Ingested {new Date(doc.ingested_at).toLocaleDateString()}
              </Badge>
            </div>
          </div>
        </div>
        <Button asChild>
          <Link href={`/drafts/new?document=${doc.document_id}`}>
            <Sparkles className="h-4 w-4" />
            Generate Draft
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Extracted Chunks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {chunks.map(([chunkId, text], idx) => (
            <div
              key={chunkId}
              className="rounded-md border border-border bg-card p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <Badge variant="secondary" className="font-mono text-[10px]">
                  Chunk #{idx + 1}
                </Badge>
                <code className="text-[10px] text-muted-foreground truncate max-w-[50%]">
                  {chunkId}
                </code>
              </div>
              <pre className="whitespace-pre-wrap font-sans text-sm text-foreground leading-relaxed">
                {text}
              </pre>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
