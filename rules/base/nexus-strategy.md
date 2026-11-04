---
name: nexus-strategy
description: Use when activating a NEXUS workflow, choosing a runbook or playbook, or coordinating handoffs between multiple agents.
alwaysApply: true
tags: [nexus, runbooks, playbooks, coordination]
---

# Nexus Strategy

The NEXUS framework lives outside this repository, under `~/.agency-agents/`.
Read the entry that matches the current phase before improvising a workflow.

## References

```json
{
  "references": {
    "nexus-strategy": {
      "path": "~/.agency-agents/strategy/nexus-strategy.md",
      "description": "Use for core NEXUS orchestration rules, principles, and overarching strategy. Read this first to understand how NEXUS phases, quality gates, and agent handoffs work."
    },
    "nexus-runbooks": {
      "path": "~/.agency-agents/strategy/runbooks",
      "description": "Use for specific execution scenarios and activation workflows (e.g., AI feature integration, MVP build, incident response). Consult when a user requests a specific NEXUS mode or scenario."
    },
    "nexus-playbooks": {
      "path": "~/.agency-agents/strategy/playbooks",
      "description": "Use for tactical guides and domain-specific instructions for agents. Consult when an agent needs step-by-step guidance on a specialized task."
    },
    "nexus-coordination": {
      "path": "~/.agency-agents/strategy/coordination",
      "description": "Use for rules on multi-agent communication, task delegation, and handoff protocols. Use to understand how agents should pass work to each other."
    },
    "nexus-quickstart": {
      "path": "~/.agency-agents/strategy/QUICKSTART.md",
      "description": "Use for initial setup and quick reference for getting started with the NEXUS framework."
    },
    "nexus-executive-brief": {
      "path": "~/.agency-agents/strategy/EXECUTIVE-BRIEF.md",
      "description": "Use for a high-level summary of NEXUS capabilities, ideal for non-technical stakeholders or initial project scoping."
    }
  }
}
```

## Resolution order

When two references disagree, prefer the more specific one:

1. `nexus-strategy` — phase model, quality gates, handoff protocol.
2. `nexus-coordination` — how agents communicate and delegate.
3. `nexus-runbooks` — the scenario being executed.
4. `nexus-playbooks` — per-agent tactical detail.
