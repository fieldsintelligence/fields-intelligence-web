---
title: "Zero retention isn’t zero if someone still reads your prompts for “safety”"
date: 2026-10-02
description: "Zero Data Retention sounds like the finish line. OpenAI’s ZDR with Private Safety Processing still lets a safety runtime read eligible prompts."
---

Zero Data Retention sounds like the finish line. OpenAI’s ZDR with Private Safety Processing shows the compromise underneath: eligible prompts and answers still land in customer-controlled storage for about 30 days so an OpenAI safety runtime can decrypt them, score them, and emit bounded safety signals. You may "own the bucket", but they own the meaning of “safe” along with whatever was used to make the determination.

That model is built for platforms that must police the open internet. It is a poor fit for regulated buyers who already have examiners, policies, and audit ownership. Standing up cloud buckets, IAM roles, lifecycle rules, and key management so a vendor can still run safety over your traffic is **complexity sold as security**.

[Fig. 1 — API retention annotated]

[Fig. 2 — Async safety annotated]

OpenAI publishes this product under their own name. Per [their guide](https://developers.openai.com/api/docs/guides/private-safety-processing), eligible prompts and responses can still be written to customer-controlled storage (about a 30-day TTL), decrypted inside an OpenAI attested safety runtime, and reduced to **bounded safety signals** that leave that runtime. In our reading, the vendor still derives safety meaning from your content.

For Fields Intelligence’s customers — banks and other regulated buyers — that is not what we mean by true ZDR. Keeping or regenerating content derived from the interaction (encrypted safety records, safety signals, a vendor-run review path) is exactly the residue those buyers are trying to avoid. Our claim is simple and scoped: **if a pipeline retains interaction content or extracts safety residue from it, it is not true zero data retention for NPI.**

That’s why we mark their published graphs **ZDR!?** — raising a question from their published architecture against Fields Intelligence’s product definition for regulated NPI, not accusing secret misconduct. We will revise or pull the annotated figures if OpenAI requests a take-down.

Fields Intelligence draws a harder line — Sovereign AI for NPI:

- No customer NPI retention on our side
- No AI interaction logs
- Usage telemetry only (access times and similar), never the conversation
- Customer-side data and app; inference on infrastructure we operate without keeping your content
- You provide the meaning of a clean audit; we provide the tool

[Fig. 3 — FI true ZDR path]

Encrypted in, encrypted out. Your data never needs to become someone else’s safety signal.

If you want hyperscaler convenience with a published safety-retention path, their ZDR+PSP is that product. If you want a vendor that never held the copy long enough to argue about it, that’s us. If you want complexity sold as security, that’s them.
