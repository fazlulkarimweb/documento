```yaml
name: patent-claims
description: Drafts utility patent claims following strict guidelines.
context: fork
allowed-tools:
  - read_file
effort: high
```
# Patent Claims Drafting Skill
## 1. Trigger Context
Activate when drafting or revising utility patent claims.
## 2. Formatting & Structure
- **Sentence Structure:** Format each claim as a single, continuous sentence, ending with a period.
- **Preamble:** State the class of the invention (e.g., "An apparatus for...", "A computer-implemented method...").
- **Transitional Phrase:** Use "comprising" for open-ended claims unless "consisting of" is requested to limit the scope.
- **Claim Tree Structure:** Build a logical claim tree with a broad independent claim, followed by dependent claims that reference the parent claim.
## 3. Operational Rules
- Ensure antecedent basis is maintained throughout (e.g., introduce an element with "a" before referring to it as "the").
- Align draft elements with the requirements of 35 U.S.C. § 112 to ensure clarity and definiteness.
