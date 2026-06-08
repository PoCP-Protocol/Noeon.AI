'use strict';

/**
 * Canonical Semantic IR → Cognitive IR bridge.
 *
 * Canonical IR governs planning and reports; Cognitive IR executes the kernel.
 * This module injects canonical governance/alignment/intent into the IR program
 * after AST compilation so both layers stay connected.
 *
 * @see docs/adr/ADR-003-canonical-architecture-and-dual-ir.md
 */

const { IRNode, IRNodeType } = require('./cognitive-ir');

function buildCognitiveBridge(canonical, governance = null, plan = null) {
  if (!canonical) return null;

  return {
    version: '1.0.0',
    surface: canonical.surface || null,
    intent: {
      goal: canonical.intent?.goal || null,
      constraints: canonical.intent?.constraints || {}
    },
    governance: {
      winner_tier: governance?.winner?.tier || plan?.governance_tier || null,
      precedence: governance?.precedence || [],
      rule_count: governance?.rule_count ?? null
    },
    alignment: {
      resonance_floor: canonical.alignment?.resonance_floor ?? null,
      covenant: canonical.alignment?.covenant?.name || canonical.alignment?.covenant?.intent || null,
      belief_count: (canonical.alignment?.beliefs || []).length
    },
    execution: {
      flow_steps: (canonical.execution?.flow || []).length,
      acts: (canonical.execution?.acts || []).length,
      budget: canonical.execution?.budget ?? null
    },
    capabilities: { ...(canonical.capabilities || {}) },
    fusion_layers: [...(canonical.fusion?.layers || plan?.fusion_layers || [])]
  };
}

function attachCognitiveBridge(ast, canonical, governance = null, plan = null) {
  const bridge = buildCognitiveBridge(canonical, governance, plan);
  if (!bridge || !ast) return bridge;

  ast.cognition = ast.cognition || {};
  ast.cognition.context = ast.cognition.context || {};
  ast.cognition.context._cognitiveBridge = bridge;

  if (!ast.cognition.goal && bridge.intent.goal) {
    ast.cognition.goal = bridge.intent.goal;
  }

  return bridge;
}

function injectCanonicalBridge(program, bridge) {
  if (!program || !bridge) return program;

  if (bridge.intent?.goal) {
    const hasIntent = (program.intents || []).some(
      (n) => n.params?.description === bridge.intent.goal || n.params?.name === bridge.intent.goal
    );
    if (!hasIntent) {
      program.add(new IRNode(IRNodeType.INTENT, {
        name: bridge.intent.goal.slice(0, 80),
        description: bridge.intent.goal,
        priority: 0.95,
        source: 'canonical',
        metadata: { bridge: true, surface: bridge.surface }
      }));
    }
  }

  if (bridge.governance?.winner_tier) {
    program.add(new IRNode(IRNodeType.META, {
      type: 'governance_arbitration',
      tier: bridge.governance.winner_tier,
      precedence: bridge.governance.precedence,
      source: 'canonical',
      metadata: { bridge: true }
    }));
  }

  if (bridge.alignment?.resonance_floor != null) {
    program.add(new IRNode(IRNodeType.CONSTRAINT, {
      type: 'alignment_resonance_floor',
      min_resonance: bridge.alignment.resonance_floor,
      covenant: bridge.alignment.covenant,
      source: 'canonical',
      metadata: { bridge: true }
    }));
  }

  if (bridge.execution?.budget != null) {
    const hasBudget = (program.constraints || []).some((n) => n.params?.type === 'resource_budget');
    if (!hasBudget) {
      program.add(new IRNode(IRNodeType.CONSTRAINT, {
        type: 'resource_budget',
        max_amount: bridge.execution.budget,
        source: 'canonical',
        metadata: { bridge: true }
      }));
    }
  }

  for (const step of bridge.execution?.flow_preview || []) {
    program.add(new IRNode(IRNodeType.DECIDE, {
      kind: step.kind || step,
      agent: step.agent || null,
      source: 'canonical.flow',
      metadata: { bridge: true }
    }));
  }

  return program;
}

function enrichBridgeWithFlowPreview(bridge, canonical) {
  if (!bridge || !canonical?.execution?.flow?.length) return bridge;
  return {
    ...bridge,
    execution: {
      ...bridge.execution,
      flow_preview: canonical.execution.flow.slice(0, 24)
    }
  };
}

module.exports = {
  buildCognitiveBridge,
  attachCognitiveBridge,
  injectCanonicalBridge,
  enrichBridgeWithFlowPreview
};
