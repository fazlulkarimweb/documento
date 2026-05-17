```yaml
name: answer-affirmative-defenses
description: Drafts answers to civil complaints, including affirmative defenses. Use when responsive pleadings are required.
context: fork
allowed-tools:
  - read_file
effort: high
```
# Answer & Affirmative Defenses Drafting Skill
## 1. Trigger Context
Activate when responding to a civil complaint or summons.
## 2. Formatting & Structure
- **Caption Block:** Replicate the exact caption from the civil complaint.
- **Paragraph Responses:** Structure responses to correspond with each numbered paragraph in the complaint:
  - "Defendant admits..."
  - "Defendant denies..."
  - "Defendant lacks knowledge or information sufficient to form a belief as to the truth of the allegations..."
- **Affirmative Defenses:** List affirmative defenses (e.g., statute of limitations, laches, failure to state a claim) under clear, bold headings.
- **Verification:** Include a verification page if required by local rules or state statutes.
## 3. Operational Rules
- Identify and raise all applicable defenses to prevent waiver under civil procedure rules.
- Follow state or federal filing timelines strictly.
- Return null for any incomplete fields in user inputs.
