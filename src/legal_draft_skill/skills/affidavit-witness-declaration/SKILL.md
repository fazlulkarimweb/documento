```yaml
name: affidavit-witness-declaration
description: Drafts formal sworn statements for evidentiary use.
context: fork
allowed-tools:
  - read_file
effort: medium
```
# Affidavit & Witness Declaration Drafting Skill
## 1. Trigger Context
Activate when generating formal, sworn factual statements for evidentiary use.
## 2. Formatting & Structure
- **Caption Block:** Standard litigation caption block.
- **Introductory Statement:** "I, [Name], declare under penalty of perjury...".
- **Factual Declarations:** Present facts using short, numbered paragraphs, written in the first person and limited to the affiant's personal knowledge.
- **Notary Block (Jurat):** Include a standard jurat or notary block at the end of the document if an affidavit is requested.
## 3. Operational Rules
- Draft statements based strictly on personal knowledge; do not include legal arguments or hearsay unless an exception applies.
- Format dates as YYYY-MM-DD.
