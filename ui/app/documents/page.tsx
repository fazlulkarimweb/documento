"use client"

import Link from "next/link"
import { FileText, ArrowRight, Trash2, Loader2 } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { DocumentUploader } from "@/components/document-uploader"
import { useDocuments } from "@/hooks/use-api"
import { deleteDocument } from "@/lib/api"
import { toast } from "sonner"
import { useState } from "react"

export default function DocumentsPage() {
  const { documents, isLoading, mutate } = useDocuments()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await deleteDocument(id)
      mutate()
      toast.success("Document deleted")
    } catch (err) {
      toast.error("Delete failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-8 py-8 md:py-12">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          Documents
        </h1>
        <p className="text-muted-foreground mt-1">
          Ingested source files. All chunks are searchable and citable.
        </p>
      </div>

      <div className="mb-8">
        <DocumentUploader />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-32" />
            </Card>
          ))}
        </div>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="mt-3 text-sm text-muted-foreground">
              No documents ingested yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documents.map((doc) => {
            const chunkCount = doc.chunk_count ?? (doc.chunks ? Object.keys(doc.chunks).length : 0)
            return (
              <Card key={doc.document_id} className="h-full hover:border-primary/40 transition-colors group relative">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">
                          <Link href={`/documents/${doc.document_id}`}>
                            <span className="absolute inset-0 z-10" aria-hidden="true" />
                            {doc.metadata.filename}
                          </Link>
                        </CardTitle>
                        <CardDescription className="text-xs relative z-20">
                          {doc.ingested_at ? new Date(doc.ingested_at).toLocaleString() : "Recently ingested"}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 relative z-20">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            disabled={deletingId === doc.document_id}
                          >
                            {deletingId === doc.document_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Document?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove <strong>{doc.metadata.filename}</strong>. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(doc.document_id)}
                              className="bg-destructive text-white hover:bg-destructive/80 cursor-pointer"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex items-center gap-2 relative z-20 pointer-events-none">
                  <Badge variant="secondary">
                    {doc.metadata.page_count} page
                    {doc.metadata.page_count === 1 ? "" : "s"}
                  </Badge>
                  <Badge variant="outline">
                    {chunkCount} chunk{chunkCount === 1 ? "" : "s"}
                  </Badge>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
