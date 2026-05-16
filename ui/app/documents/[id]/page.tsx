"use client"

import { use } from "react"
import Link from "next/link"
import { ArrowLeft, FileText, Sparkles, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useDocument, useDocuments } from "@/hooks/use-api"
import { deleteDocument } from "@/lib/api"
import { notFound, useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

export default function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { document: doc, isLoading } = useDocument(id)
  const { mutate: mutateDocuments } = useDocuments()
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteDocument(id)
      mutateDocuments()
      toast.success("Document deleted")
      router.push("/documents")
    } catch (err) {
      toast.error("Failed to delete document", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 md:px-8 py-8 md:py-12 animate-pulse">
        <div className="h-8 w-24 bg-muted rounded mb-4" />
        <div className="h-12 w-3/4 bg-muted rounded mb-6" />
        <div className="h-64 bg-muted rounded" />
      </div>
    )
  }

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
            Document not found.
          </CardContent>
        </Card>
      </div>
    )
  }

  const chunks = doc.chunks ? Object.entries(doc.chunks) : []

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
                Ingested {doc.ingested_at ? new Date(doc.ingested_at).toLocaleDateString() : "Recently"}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="icon" disabled={deleting}>
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 text-destructive" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Document?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove <strong>{doc.metadata.filename}</strong> and all its extracted chunks. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-white hover:bg-destructive/80 cursor-pointer"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button asChild>
            <Link href={`/drafts/new?document=${doc.document_id}`}>
              <Sparkles className="h-4 w-4" />
              Generate Draft
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Extracted Chunks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {chunks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              Chunks are still being processed or were not returned for this document.
            </p>
          ) : chunks.map(([chunkId, text], idx) => (
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
