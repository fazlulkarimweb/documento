```yaml
name: mutual-nda
description: Drafts mutual non-disclosure agreements. Use to protect confidential information during business negotiations.
context: fork
allowed-tools:
  - read_file
effort: medium
```
# Non-Disclosure Agreement Drafting Skill
## 1. Trigger Context
Activate when asked to draft a non-disclosure agreement (NDA) or confidentiality agreement.
## 2. Formatting & Structure
- **Definition of Confidential Information:** Define the scope of protected disclosures.
- **Exclusions:** Explicitly list exclusions from confidentiality (e.g., publicly available information or independently developed details).
- **Standard of Care:** Define the receiving party's obligation to protect information (e.g., using at least a reasonable standard of care).
- **Term:** Specify both the disclosure period and the survival period for confidentiality obligations.
## 3. Operational Rules
- Propose a mutual agreement as the default unless a unilateral structure is requested.
- Include a notice regarding immunity under the Defend Trade Secrets Act (DTSA).
