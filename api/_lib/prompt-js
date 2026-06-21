export function buildPrompt(control, evidenceText) {
  return `You are an AI evidence validation assistant for a GRC/compliance team. Assess whether the submitted evidence satisfies the control requirement below.

Control ID: ${control.id}
Framework: ${control.framework}
Control requirement: ${control.requirement}
What counts as sufficient evidence: ${control.criteria}

Submitted evidence:
"""
${evidenceText}
"""

Respond with ONLY valid JSON, no markdown fences, no preamble, in exactly this shape:
{
  "status": "Satisfied" | "Partial" | "Missing",
  "confidence": "High" | "Medium" | "Low",
  "reasoning": "2-3 sentences explaining the assessment",
  "evidence_citations": ["short exact snippets copied verbatim from the submitted evidence that support the assessment, or an empty array if none apply"],
  "gaps": ["specific items still needed to fully satisfy the control, empty array if fully satisfied"],
  "reviewer_focus": "one sentence on what a human reviewer should specifically verify before signing off"
}

Be conservative: if the evidence shows a policy or stated intent rather than proof the control is actually operating, mark it Partial or Missing rather than Satisfied. Only cite text that is actually present in the submitted evidence above — never invent a citation.`;
}
