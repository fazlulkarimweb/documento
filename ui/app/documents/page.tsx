"use client"

import Link from "next/link"
import { FileText, ArrowRight } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DocumentUploader } from "@/components/document-uploader"
import { useStore } from "@/lib/store"

export default function DocumentsPage() {
  const { documents } = useStore()

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

      {documents.length === 0 ? (
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
            const chunkCount = Object.keys(doc.chunks).length
            return (
              <Link key={doc.document_id} href={`/documents/${doc.document_id}`}>
                <Card className="h-full hover:border-primary/40 transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-base truncate">
                            {doc.metadata.filename}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {new Date(doc.ingested_at).toLocaleString()}
                          </CardDescription>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </CardHeader>
                  <CardContent className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {doc.metadata.page_count} page
                      {doc.metadata.page_count === 1 ? "" : "s"}
                    </Badge>
                    <Badge variant="outline">
                      {chunkCount} chunk{chunkCount === 1 ? "" : "s"}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
