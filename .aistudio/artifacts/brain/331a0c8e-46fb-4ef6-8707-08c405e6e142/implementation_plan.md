# Implementation Plan: Unified Rules & Policy Enforcement Across All Integrations

Unify traffic deflection and routing logic so that the **Rules & Policies** engine is the single source of truth across all integrations. Replace the disconnected deflection picker in the integration views with a live synced policy status banner, enable dynamic zero-redeploy edge evaluation, and auto-sync legacy fallback fields when rulesets are saved.

---

## 1. Problem Statement & User Decisions

### Current Architecture Disconnect
- Currently, inside `UserIntegrationTab.tsx` and `AgentSetupView.tsx`, there is an isolated `DeflectionControlBar` allowing users to select "Edge 403 Forbidden", "Stealth 404 Drop", or "Redirect URL".
- This creates confusion because users also define granular bot rules, velocity rate limits (e.g., 50 requests/min), IP blocklists, datacenter blocks, and custom response statuses (Multi-Status vs Single-Status) in the **Rules & Policies** tab (`UserRoutingTab.tsx`).
- When a user changes rules in Rules & Policies, the Integrations tab was still presenting a separate manual deflection choice instead of reflecting active policies.

### Confirmed User Decisions
1. **Integration Status UI**: Replace the disconnected deflection bar with a **Synced Policy Banner** that displays active ruleset summary, enforcement mode (Single vs Multi-Status), and a direct shortcut button to *Rules & Policies*.
2. **Integration Code Snippets**: Ensure all generated snippets (Cloudflare Worker, 1-Line script, WordPress plugin, Next.js middleware, Express) perform dynamic edge classification checks (`/api/classify`) so rules take effect immediately with **zero redeploy**.
3. **Legacy Backwards Compatibility**: When saving rules in Rules & Policies, automatically compute the active default action and auto-sync it to `botUrl` so legacy downstream scripts remain fully functional.

---

## 2. Proposed Changes & Architecture

### Phase A: Build `SyncedPolicyBanner` Component
Create `client/src/components/user-dashboard/SyncedPolicyBanner.tsx`:
- Clean, compact enterprise card adhering to the SaaS design principles (`font-mono` metrics, clear typographic hierarchy, subtle borders, no static pill enclosures).
- Fetches and displays:
  - Active ruleset name and count of active protection rules (Velocity limiter, Bot defense, IP blocklist, Datacenter/VPN).
  - Configured response action: Single Status (e.g. `403 Forbidden`, `404 Not Found`, or fallback redirect) or Multi-Status (e.g. `429` for velocity, `403` for IP blocklist, `404` for VPN).
  - Status indicator: `Live Edge Synced (Zero-Redeploy Active)`.
  - Quick action: `Edit Rules & Policies` button with a direct link navigating to `/dashboard?tab=routing`.
- Responsive and clean in both desktop and mobile viewports.

### Phase B: Clean up `UserIntegrationTab.tsx`
- Replace `DeflectionControlBar` with `SyncedPolicyBanner` across the integration detail view.
- Remove redundant manual deflection mutation state (`updateUrlsMutation`, `manualDeflectionAction`, `handleManualDeflectionChange`) from the Integrations tab, eliminating duplicate controls.
- Update code generator parameters (`effectiveManualBotTarget`) to pull directly from the active ruleset configuration and `serverConfig.botUrl`.
- Ensure all copy clearly explains that rules configured under Rules & Policies are automatically enforced live at the edge.

### Phase C: Clean up `AgentSetupView.tsx` & `agenticPrompts.ts`
- Remove the redundant `DeflectionControlBar` from `AgentSetupView.tsx`.
- Replace it with a synced policy preview informing the AI Agent that deflection is centrally driven by the live CleanTraffic rules engine.
- Update `agenticPrompts.ts` so agent instructions generate middleware that queries `/api/classify` or dynamically honors the active policy verdict without hardcoding rigid static deflection rules.

### Phase D: Auto-Sync in `UserRoutingTab.tsx`
- Enhance `saveMutation` in `UserRoutingTab.tsx`:
  - When saving rulesets, inspect the active ruleset.
  - Determine the default deflection action from the ruleset (whether it's `403`, `404`, `429`, or a redirect URL).
  - Automatically persist this into `botUrl` and `redirect-urls` so existing legacy consumers, integrations, and reports remain 100% backward-compatible.
  - Invalidate both `["/api/user/redirect-urls"]` and `["/api/user/profile"]` queries upon save.

### Phase E: Dynamic Edge Snippets Verification
- Verify `shared/integrationGenerators.ts`:
  - Verify Cloudflare Worker, Next.js middleware, WordPress plugin, and Express generators.
  - Ensure all runtime templates check the verdict response from `/api/classify` (e.g., `verdict.action`, `verdict.statusCode`, or `verdict.redirectUrl`) and return the appropriate HTTP status code (`403`, `404`, `429`) or redirect header dynamically without requiring edge re-deployment.

---

## 3. Verification & Testing Plan

1. **Compilation & Lint**:
   - Run `lint_applet` and `compile_applet` to verify zero TypeScript errors or missing imports.
2. **UI & Navigation Verification**:
   - Verify `UserIntegrationTab`: No redundant deflection picker; `SyncedPolicyBanner` displays active ruleset name, active status, and "Edit Rules & Policies" link.
   - Verify `AgentSetupView`: Clean integration prompt generation referencing dynamic edge rules.
3. **Rules Auto-Sync Verification**:
   - Verify saving rules in Rules & Policies persists both `rulesetsConfig` and synced `botUrl`.
   - Verify navigating from Rules & Policies to Integrations displays immediate synced status.
