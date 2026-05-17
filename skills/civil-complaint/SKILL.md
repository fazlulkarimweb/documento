```yaml
name: civil-complaint
description: Drafts formal initial pleadings to initiate a lawsuit.
context: fork
allowed-tools:
  - read_file
effort: high
```
# Civil Complaint Drafting Skill
## 1. Trigger Context
Activate when asked to draft a civil complaint, initial pleading, or petition.
## 2. Formatting & Structure
- **Caption Block:** Position court name, parties, case number, and document title at the top of page 1.
- **Jurisdiction & Venue:** Draft separate paragraphs establishing personal jurisdiction, subject matter jurisdiction, and venue.
- **Parties:** Explicitly list and describe all plaintiffs and defendants, including their addresses and entity types.
- **Factual Allegations:** Chronologically list factual assertions using numbered paragraphs.
- **Causes of Action:** Separate each cause of action with a Roman-numeral heading. Detail the legal elements of each claim alongside corresponding factual assertions.
- **Prayer for Relief:** Conclude with a clear request for damages, equitable relief, interest, and attorney's fees.
- **Signature Block:** Include a signature block for the attorney of record.
## 3. Operational Rules
- Use formal legal terminology and avoid colloquial language.
- Ensure dates are formatted as YYYY-MM-DD and preserve currency symbols exactly.
- Insert clear placeholders for missing factual details.
