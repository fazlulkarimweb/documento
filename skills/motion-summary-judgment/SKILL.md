```yaml
name: motion-summary-judgment
description: Drafts motions for judgment based on undisputed facts.
context: fork
allowed-tools:
  - read_file
effort: high
```
# Motion for Summary Judgment Drafting Skill
## 1. Trigger Context
Activate when the factual record supports a judgment without proceeding to trial.
## 2. Formatting & Structure
- **Notice of Motion:** Explicitly state the legal basis under FRCP Rule 56 or the state equivalent.
- **Statement of Undisputed Material Facts:** Present facts in separately numbered paragraphs, with citation placeholders to specific evidence (e.g., depositions, declarations, or exhibits).
- **Memorandum of Points and Authorities:** Apply the relevant statutory and case law to the undisputed facts.
- **Proposed Order:** Draft a separate proposed order granting the motion for summary judgment.
## 3. Operational Rules
- Clearly link each statement of fact to its corresponding evidentiary citation.
- Address potential counterarguments to establish that no genuine dispute of material fact exists.
