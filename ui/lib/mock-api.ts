import type {
  IngestResponse,
  DraftResponse,
  FeedbackResponse,
  DraftType,
} from "./types"

function uid() {
  return crypto.randomUUID()
}

export async function mockIngest(file: File): Promise<IngestResponse> {
  await new Promise((r) => setTimeout(r, 900))
  const document_id = uid()
  return {
    document_id,
    status: "success",
    metadata: {
      filename: file.name,
      page_count: 4,
      document_id,
    },
    chunks: {
      [uid()]:
        "## LEGAL NOTICE / URGENT DEMAND FOR POSSESSION\n\nDATE: May 1, 2026 On behalf of Md Jahir (the \"Landlord\")\n\nFROM: Advocate Rahat Khan Road 12, House 45, Uttara, Dhaka\n\nTO: Md Karim (the \"Tenant\") Flat 4B, Bluebell Apartments\n\nREF: Breach of Lease Agreement dated Jan 01, 2024.",
      [uid()]:
        "Statement of Defaults: November 2025 through April 2026 UNPAID. Total Arrears: 270,000 BDT (excluding utility surcharges of 12,400 BDT). Despite several verbal reminders and a formal letter sent via courier on March 15, 2026, you have remained unresponsive.",
      [uid()]:
        "Pursuant to Clause 14 (Termination for Default) of the Lease Agreement, the Landlord hereby exercises the right to terminate your tenancy effective immediately. Vacation of Property by no later than May 15, 2026.",
    },
    message: "Document ingested, chunked, and indexed successfully (mock)",
  }
}

export async function mockGenerateDraft(opts: {
  document_ids: string[]
  draft_type: DraftType | string
  focus_query?: string
}): Promise<DraftResponse> {
  await new Promise((r) => setTimeout(r, 1400))
  const chunkId = uid()
  return {
    draft_id: uid(),
    status: "success",
    draft_content: `**MEMORANDUM By AI**

**TO:** Senior Partners
**FROM:** Legal Assistant, Pearson Specter Litt
**DATE:** May 16, 2026
**RE:** ${opts.focus_query || "Notice to Vacate and Rent Arrears – Md Karim (Flat 4B, Bluebell Apartments)"}

**1. Parties and Subject Property**
The Landlord, Md Jahir, is seeking the eviction of the tenant, Md Karim, from the residential premises located at Flat 4B, Bluebell Apartments, Sector 12, Uttara, Dhaka [${chunkId}]. It is noted that while the original lease contains a typo citing "Sector 11," the building is actually located in "Sector 12" [${chunkId}].

**2. Breach of Tenancy and Arrears**
The tenant is in material breach of the lease agreement dated January 1, 2024, due to non-payment of rent. The defaults span six months from November 2025 through April 2026.

The total outstanding debt is 282,400 BDT, which consists of:
*   **Rental Arrears:** 270,000 BDT (Monthly rate of 45,000 BDT)
*   **Utility Surcharges:** 12,400 BDT

**3. Final Demands and Deadlines**
*   **Payment:** Full sum of 282,400 BDT within 7 days of the May 1, 2026 notice.
*   **Vacation of Property:** Tenant must hand over vacant possession no later than **May 15, 2026**.`,
    citations: [
      {
        source_document_id: opts.document_ids[0] ?? uid(),
        source_file_name: "messy_legal_notice.pdf",
        text_segment:
          "Pursuant to Clause 14 (Termination for Default) of the Lease Agreement, the Landlord hereby exercises the right to terminate your tenancy effective immediately.",
      },
      {
        source_document_id: opts.document_ids[0] ?? uid(),
        source_file_name: "messy_legal_notice.pdf",
        text_segment:
          "Total Arrears: 270,000 BDT (excluding utility surcharges of 12,400 BDT).",
      },
    ],
    source_chunks: {
      [chunkId]:
        "Pursuant to Clause 14 (Termination for Default) of the Lease Agreement, the Landlord hereby exercises the right to terminate your tenancy effective immediately. Vacation of Property by no later than May 15, 2026.",
    },
    grounding_confidence: 0.94,
  }
}

export async function mockFeedback(opts: {
  draft_type: string
  original_content: string
  edited_content: string
}): Promise<FeedbackResponse> {
  await new Promise((r) => setTimeout(r, 800))
  return {
    status: "success",
    learned_pattern: {
      pattern_type: "AI_Attribution_In_Header",
      description:
        "The legal operator added the suffix 'By AI' to the main document title. This indicates a firm-specific requirement to clearly distinguish AI-generated drafts from human-authored work.",
      suggested_instruction:
        "Ensure all legal draft headers include the suffix 'By AI' to distinguish machine-generated content from human-authored work.",
      draft_type: opts.draft_type,
    },
    message: `Feedback for ${opts.draft_type} processed and pattern learned (mock)`,
  }
}
