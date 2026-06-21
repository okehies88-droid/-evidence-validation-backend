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
  "risk_level": "Critical" | "High" | "Medium" | "Low",
  "risk_statement": "1-2 sentences describing the concrete consequence if the identified gaps are not remediated — what could actually go wrong, not a restatement of the control",
  "reasoning": "2-3 sentences explaining the assessment",
  "evidence_citations": ["short exact snippets copied verbatim from the submitted evidence that support the assessment, or an empty array if none apply"],
  "gaps": ["specific items still needed to fully satisfy the control, empty array if fully satisfied"],
  "reviewer_focus": "one sentence on what a human reviewer should specifically verify before signing off"
}

Be conservative: if the evidence shows a policy or stated intent rather than proof the control is actually operating, mark it Partial or Missing rather than Satisfied. Only cite text that is actually present in the submitted evidence above — never invent a citation.

For risk_level: base it on the severity of exposure if the gaps you identified go unaddressed, not on how the control sounds in theory. A Missing or Partial status on a control protecting sensitive production access or sensitive data is typically Critical or High; a Missing or Partial status on a lower-stakes administrative control is typically Medium or Low. If status is Satisfied with no gaps, risk_level should usually be Low, reflecting residual risk only.`;
}
