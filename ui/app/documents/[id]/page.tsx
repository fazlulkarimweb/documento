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



{
  "draft_id": "95734119-02a7-4710-9e84-f0723d8a907a",
  "status": "success",
  "draft_content": "**MEMORANDUM BY HARVEY**\n\n**BACKGROUND**\nMd Karim (the \"Tenant\") occupies the residential apartment located at Flat 4B, Bluebell Apartments under a lease agreement dated January 1, 2024 [2]. The Tenant failed to remit monthly rental payments of 45,000 BDT for a period of six months, specifically from November 2025 through April 2026 [2], [3]. Md Jahir (the \"Landlord\") previously issued a formal letter via courier on March 15, 2026, yet the Tenant remains unresponsive [3]. Consequently, the Landlord exercises the right to terminate the tenancy effective immediately under Clause 14 of the Lease Agreement [3].\n\n**LEGAL ASSESMENT & DEMANDS**\nThe Tenant currently owes a total of 282,400 BDT, which consists of 270,000 BDT in rent arrears and 12,400 BDT in utility surcharges [3]. The Landlord demands the following:\n*   **Payment:** Full payment of 282,400 BDT within 7 days of the notice receipt [3].\n*   **Vacation of Property:** The Tenant must hand over vacant possession of the premises no later than May 15, 2026 [3].\n\nFailure to comply with the May 15 deadline will result in the commencement of legal proceedings under the Premises Rent Control Act [1]. If the property is not vacated by May 16, an eviction suit will be filed on behalf of Md Jahir [1].\n\n**NOTES ON DISCREPANCIES**\nThe original lease agreement contains a typographical error regarding the address, incorrectly citing \"Sector 11\" while the property is located in \"Sector 12\" [2]. Additionally, the payment ledger signature is noted as smudged and must be mapped to system ID 'doc_8f7e6d5c' [1].\n\nSigned,\n\nJHON and ROCKY\n\n***\n\n**Source:**\n[1] CHUNK ID: 5e7f1e65-b564-46a9-af91-8974417376a2\n[2] CHUNK ID: 7ad665ba-4112-4618-b544-f54e5dca098f\n[3] CHUNK ID: 2733af4b-11c1-48fb-a963-34dc7e9671c6",
  "source_chunks": {
    "5e7f1e65-b564-46a9-af91-8974417376a2": "Harvey's Note: \"May 15 is our deadline Failure to comply will result in legal proceedings under the Premises Rent Control Act.\n\nfor the take-home assessment. If he isn't out by the 16th, tell Jahir we file the eviction suit. No extensions.\"\n\n## Verification of Claims:\n\n- I, Md Jahir, hereby declare that the facts stated above are true to the best of my knowledge and grounded in the payment ledger and bank statements attached as Exhibit A.\n\n<!-- image -->\n\n[Scribbled Signature: Md Jahir]\n\nWitness 1: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\n\nWitness 2: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\n\nHarvey's Note: \"The signature on the ledger is smudged. Ensure the system maps this back to correct ID 'doc\\_8f7e6d5c' regardless of the noise.\"\n\nFinal Warning: This notice is sent without prejudice to any other rights or remedies.",
    "7ad665ba-4112-4618-b544-f54e5dca098f": "## LEGAL NOTICE / URGENT DEMAND FOR POSSESSION\n\nDATE: May 1, 2026 On behalf of Md Jahir (the \"Landlord\")\n\nFROM: Advocate Rahat Khan Road 12, House 45, Uttara, Dhaka\n\nTO: Md Karim (the \"Tenant\") Flat 4B, Bluebell Apartments\n\nSector 12, Uttara, Dhaka\n\nREF: Breach of Lease Agreement dated Jan 01, 2024. SUBJECT: NOTICE TO VACATE PREMISES DUE TO NON-PAYMENT OF RENT\n\nDear Md Karim, Harvey's Note:\n\nUnder instruction from my client, Md Jahir, you are hereby notified that you are in material breach of the tenancy agreement signed on January 1, 2024.\n\nThe premises under dispute is the residential apartment located at Flat 4B,\n\n\"The address in the original lease has a typo-it says 'Sector 11' but the building is in 'Sector 12'. Our OCR needs to catch this discrepancy.\"\n\nBluebell Apartments, which you have occupied since the inception of the lease.\n\n## Statement of Defaults:\n\nOur records indicate that you have failed to remit the monthly rental amount of 45,000 BDT:\n\nNovember 2025: UNPAID",
    "2733af4b-11c1-48fb-a963-34dc7e9671c6": "November 2025: UNPAID\n\nDecember 2025: UNPAID\n\nJanuary 2026: UNPAID\n\nFebruary 2026: UNPAID\n\nMarch 2026: UNPAID\n\nApril 2026: UNPAID\n\n## Total Arrears: 270,000 BDT (excluding utility surcharges of 12,400 BDT).\n\nDespite several verbal reminders and a formal letter sent via courier on March 15, 2026, you have remained unresponsive.\n\nHarvey's Note: \"Karim is a ghost. I heard he's dodging the building manager too. Make sure the 'Grounded Retrieval' pulls the courier receipt from March.\"\n\n## Notice of Termination:\n\nPursuant to Clause 14 (Termination for Default) of the Lease Agreement, the Landlord hereby exercises the right to terminate your tenancy effective immediately.\n\n## Demands:\n\n1. Immediate Payment: You are required to pay the sum of 282,400 BDT (Arrears + Utilities) within 7 days of receipt of this notice.\n2. Vacation of Property: You are directed to hand over the keys and vacant possession of Flat 4B no later than May 15, 2026."
  },
  "draft_type": "legal-memo",
  "document_ids": [
    "ead8ea62-41c9-42e0-ba63-99030c785e89"
  ],
  "instructions": "string",
  "created_at": "2026-05-16T18:20:16.061792Z",
  "updated_at": "2026-05-16T18:20:16.061792Z",
  "grounding_confidence": 0
}