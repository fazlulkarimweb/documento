"use client"

import { useCallback, useRef, useState } from "react"
import { Upload, Loader2, FileCheck2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ingestDocument } from "@/lib/api"
import { useStore } from "@/lib/store"
import { toast } from "sonner"

export function DocumentUploader({
  onIngested,
}: {
  onIngested?: (documentId: string) => void
}) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { addDocument } = useStore()

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return
      setUploading(true)
      try {
        for (const file of Array.from(files)) {
          const res = await ingestDocument(file)
          addDocument({ ...res, ingested_at: new Date().toISOString() })
          toast.success("Document ingested", {
            description: `${file.name} • ${res.metadata.page_count} page(s)`,
          })
          onIngested?.(res.document_id)
        }
      } catch (err) {
        toast.error("Ingest failed", {
          description: err instanceof Error ? err.message : "Unknown error",
        })
      } finally {
        setUploading(false)
      }
    },
    [addDocument, onIngested],
  )

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        handleFiles(e.dataTransfer.files)
      }}
      className={cn(
        "rounded-lg border-2 border-dashed border-border bg-card p-8 text-center transition-colors",
        dragging && "border-primary bg-accent/40",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <Upload className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <h3 className="mt-4 text-base font-medium text-foreground text-balance">
        Ingest a legal document
      </h3>
      <p className="mt-1 text-sm text-muted-foreground text-pretty">
        Drag and drop or browse. Any file type is supported — scanned PDFs,
        handwritten notes, images, contracts, emails.
      </p>
      <div className="mt-4 flex items-center justify-center gap-2">
        <Button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing
            </>
          ) : (
            <>
              <FileCheck2 className="h-4 w-4" />
              Select files
            </>
          )}
        </Button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        PDF, PNG, JPG, DOCX, TXT, MD — any type accepted
      </p>
    </div>
  )
}
