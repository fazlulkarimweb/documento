```yaml
name: advance-healthcare-directive
description: Drafts Advance Healthcare Directives. Use to designate a healthcare proxy and specify medical treatment preferences.
context: fork
allowed-tools:
  - read_file
effort: medium
```
# Advance Healthcare Directive Drafting Skill
## 1. Trigger Context
Activate when asked to draft a living will, healthcare proxy, or advance directive.
## 2. Formatting & Structure
- **Healthcare Agent Designation:** Name the primary and successor agents authorized to make medical decisions.
- **End-of-Life Instructions:** Detail specific preferences regarding life-sustaining treatment, nutrition, and hydration.
- **HIPAA Disclosure:** Include a HIPAA authorization clause allowing the designated agent to access medical records.
- **Execution Requirements:** Include state-specific witness signatures or notary acknowledgment fields.
## 3. Operational Rules
- Utilize state-approved statutory forms as the default drafting baseline.
- Ensure instructions are clear and unambiguous to help medical professionals execute the directives.
