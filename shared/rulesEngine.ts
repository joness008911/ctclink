export type RuleField = 
  | "bot_threat"
  | "vpn"
  | "datacenter"
  | "country"
  | "velocity"
  | "ip_blocklist"
  | "devtools"
  | "tor_proxy";

export type RuleOperator = 
  | "is"
  | "is_not"
  | "in"
  | "not_in"
  | "greater_than";

export interface RuleCondition {
  id: string;
  field: RuleField;
  operator: RuleOperator;
  value: string;
  logicalOp?: "AND" | "OR";
}

export type RuleAction = "block_response" | "redirect" | "challenge" | "allow";

export interface RuleHeader {
  key: string;
  value: string;
}

export interface RuleStep {
  id: string;
  name: string;
  stepNumber: number;
  enabled: boolean;
  conditions: RuleCondition[];
  action: RuleAction;
  statusCode: number;
  headers: RuleHeader[];
  bodyType: "application/json" | "text/html" | "text/plain";
  body: string;
  redirectUrl?: string;
}

export interface RuleResponseConfig {
  action: RuleAction;
  statusCode: number;
  headers: RuleHeader[];
  bodyType: "application/json" | "text/html" | "text/plain";
  body: string;
  redirectUrl?: string;
}

export const DEFAULT_SINGLE_RESPONSE: RuleResponseConfig = {
  action: "block_response",
  statusCode: 403,
  headers: [{ key: "Content-Type", value: "application/json" }],
  bodyType: "application/json",
  body: '{"message": "Access denied: request blocked by unified security rule"}',
};

export interface Ruleset {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  isDefault?: boolean;
  templateId?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  rules: RuleStep[];
  responseMode?: "multi" | "single";
  singleResponse?: RuleResponseConfig;
}

export const HTTP_STATUS_OPTIONS = [
  { code: 403, label: "403 Forbidden", description: "Standard access forbidden response" },
  { code: 404, label: "404 Not Found", description: "Stealth deflection simulating non-existent page" },
  { code: 409, label: "409 Conflict", description: "Request conflicts with current state" },
  { code: 410, label: "410 Gone", description: "Resource permanently removed" },
  { code: 421, label: "421 Misdirected Request", description: "Server unable to produce response" },
  { code: 423, label: "423 Locked", description: "Resource is locked / access denied" },
  { code: 424, label: "424 Failed Dependency", description: "Required validation condition failed" },
  { code: 429, label: "429 Too Many Requests", description: "Velocity / rate limit threshold exceeded" },
  { code: 451, label: "451 Unavailable For Legal Reasons", description: "Geographic or jurisdictional restriction" },
  { code: 500, label: "500 Internal Server Error", description: "Simulated server failure" },
];

export const RULE_FIELD_DEFINITIONS: Record<RuleField, { label: string; icon: string; defaultOperators: RuleOperator[]; defaultValues: string[] }> = {
  bot_threat: {
    label: "Browser Bot",
    icon: "bot",
    defaultOperators: ["is", "is_not"],
    defaultValues: ["Bad", "Automated", "Scraper", "Headless"]
  },
  vpn: {
    label: "VPN / Anonymizer",
    icon: "shield",
    defaultOperators: ["is", "is_not"],
    defaultValues: ["True", "False"]
  },
  datacenter: {
    label: "Datacenter Cloud ASN",
    icon: "server",
    defaultOperators: ["is", "is_not"],
    defaultValues: ["True", "False"]
  },
  country: {
    label: "Country / Geo",
    icon: "globe",
    defaultOperators: ["not_in", "in", "is", "is_not"],
    defaultValues: ["Not Allowed", "Restricted", "ALL"]
  },
  velocity: {
    label: "Request Velocity",
    icon: "activity",
    defaultOperators: ["greater_than", "is"],
    defaultValues: ["50", "20", "100", "Exceeded"]
  },
  ip_blocklist: {
    label: "IP Blocklist",
    icon: "lock",
    defaultOperators: ["is", "is_not"],
    defaultValues: ["True", "Listed"]
  },
  devtools: {
    label: "Developer tools / Headless",
    icon: "code",
    defaultOperators: ["is", "is_not"],
    defaultValues: ["True", "False"]
  },
  tor_proxy: {
    label: "Tor Exit Node / Proxy",
    icon: "shield-alert",
    defaultOperators: ["is", "is_not"],
    defaultValues: ["True", "False"]
  }
};

// Pre-made industry and threat templates matching user screenshots
export const PREMADE_RULE_TEMPLATES: Array<{
  id: string;
  name: string;
  description: string;
  tags: string[];
  rules: RuleStep[];
}> = [
  {
    id: "block_bots",
    name: "Block bots",
    description: "Automatically block visitors identified as malicious bots or using tools commonly associated with automated traffic.",
    tags: ["Account Protection", "Bot Mitigation", "Content Protection", "E-commerce"],
    rules: [
      {
        id: "step_bot_1",
        name: "Browser Bot is Bad",
        stepNumber: 2,
        enabled: true,
        conditions: [
          {
            id: "cond_1",
            field: "bot_threat",
            operator: "is",
            value: "Bad",
          }
        ],
        action: "block_response",
        statusCode: 403,
        headers: [{ key: "Content-Type", value: "application/json" }],
        bodyType: "application/json",
        body: '{"message": "Blocked by rule: automated bot signature detected"}'
      },
      {
        id: "step_bot_2",
        name: "Datacenter ASN is True",
        stepNumber: 3,
        enabled: true,
        conditions: [
          {
            id: "cond_2",
            field: "datacenter",
            operator: "is",
            value: "True",
          }
        ],
        action: "block_response",
        statusCode: 403,
        headers: [{ key: "Content-Type", value: "application/json" }],
        bodyType: "application/json",
        body: '{"message": "Blocked by rule: cloud datacenter traffic prohibited"}'
      },
      {
        id: "step_bot_3",
        name: "Developer tools is True",
        stepNumber: 4,
        enabled: true,
        conditions: [
          {
            id: "cond_3",
            field: "devtools",
            operator: "is",
            value: "True",
          }
        ],
        action: "block_response",
        statusCode: 403,
        headers: [{ key: "Content-Type", value: "application/json" }],
        bodyType: "application/json",
        body: '{"message": "Blocked by rule: headless automation detected"}'
      }
    ]
  },
  {
    id: "block_vpn",
    name: "Block VPN Users",
    description: "Block visitors connecting through VPN connections across web and mobile.",
    tags: ["Account Protection", "Content Protection", "Payment Fraud", "E-commerce"],
    rules: [
      {
        id: "step_vpn_1",
        name: "VPN Tunnel is True",
        stepNumber: 2,
        enabled: true,
        conditions: [
          {
            id: "cond_vpn_1",
            field: "vpn",
            operator: "is",
            value: "True",
          }
        ],
        action: "block_response",
        statusCode: 403,
        headers: [{ key: "Content-Type", value: "application/json" }],
        bodyType: "application/json",
        body: '{"message": "Access restricted: VPN connections are not permitted"}'
      },
      {
        id: "step_vpn_2",
        name: "Tor Exit Relay is True",
        stepNumber: 3,
        enabled: true,
        conditions: [
          {
            id: "cond_vpn_2",
            field: "tor_proxy",
            operator: "is",
            value: "True",
          }
        ],
        action: "block_response",
        statusCode: 403,
        headers: [{ key: "Content-Type", value: "application/json" }],
        bodyType: "application/json",
        body: '{"message": "Access restricted: Tor exit node detected"}'
      }
    ]
  },
  {
    id: "block_region",
    name: "Block region spoofing",
    description: "Block visitors attempting to mask or falsify their geographic location or outside permitted target regions.",
    tags: ["Account Protection", "Content Protection", "Payment Fraud", "E-commerce"],
    rules: [
      {
        id: "step_geo_1",
        name: "Country is Not Allowed AND VPN is True",
        stepNumber: 2,
        enabled: true,
        conditions: [
          {
            id: "cond_geo_1",
            field: "country",
            operator: "not_in",
            value: "Not Allowed",
          },
          {
            id: "cond_geo_2",
            field: "vpn",
            operator: "is",
            value: "True",
            logicalOp: "AND",
          }
        ],
        action: "block_response",
        statusCode: 451,
        headers: [{ key: "Content-Type", value: "application/json" }],
        bodyType: "application/json",
        body: '{"message": "Access restricted: unpermitted region with VPN tunnel"}'
      }
    ]
  },
  {
    id: "bot_or_vpn",
    name: "Bot or VPN Protection",
    description: "Block visitors if they are identified as an automated browser bot OR connecting through a VPN tunnel.",
    tags: ["Bot Mitigation", "Account Protection", "Fraud Prevention"],
    rules: [
      {
        id: "step_bot_vpn_1",
        name: "Browser Bot is Bad OR VPN is True",
        stepNumber: 2,
        enabled: true,
        conditions: [
          {
            id: "cond_bv_1",
            field: "bot_threat",
            operator: "is",
            value: "Bad",
          },
          {
            id: "cond_bv_2",
            field: "vpn",
            operator: "is",
            value: "True",
            logicalOp: "OR",
          }
        ],
        action: "block_response",
        statusCode: 403,
        headers: [{ key: "Content-Type", value: "application/json" }],
        bodyType: "application/json",
        body: '{"message": "Blocked: automated bot or VPN tunnel detected"}'
      }
    ]
  },
  {
    id: "rate_limiting",
    name: "Velocity Spike & Rate Limiting",
    description: "Throttle rapid automated probes and velocity spikes with HTTP 429 Too Many Requests.",
    tags: ["Bot Mitigation", "API Protection", "Velocity Defense"],
    rules: [
      {
        id: "step_vel_1",
        name: "Request Velocity is Exceeded",
        stepNumber: 2,
        enabled: true,
        conditions: [
          {
            id: "cond_vel_1",
            field: "velocity",
            operator: "is",
            value: "Exceeded",
          }
        ],
        action: "block_response",
        statusCode: 429,
        headers: [
          { key: "Content-Type", value: "application/json" },
          { key: "Retry-After", value: "60" }
        ],
        bodyType: "application/json",
        body: '{"message": "Too many requests. Please slow down and try again."}'
      }
    ]
  },
  {
    id: "ato_prevention",
    name: "ATO Prevention",
    description: "Automatically block visitors showing signals commonly associated with account takeover attempts.",
    tags: ["Account Protection", "Payment Fraud", "Bot Mitigation"],
    rules: [
      {
        id: "step_ato_1",
        name: "IP Blocklist is True",
        stepNumber: 2,
        enabled: true,
        conditions: [
          {
            id: "cond_ato_1",
            field: "ip_blocklist",
            operator: "is",
            value: "True",
          }
        ],
        action: "block_response",
        statusCode: 403,
        headers: [{ key: "Content-Type", value: "application/json" }],
        bodyType: "application/json",
        body: '{"message": "Account protection: high-risk address blocked"}'
      },
      {
        id: "step_ato_2",
        name: "Tor Proxy Relay is True",
        stepNumber: 3,
        enabled: true,
        conditions: [
          {
            id: "cond_ato_2",
            field: "tor_proxy",
            operator: "is",
            value: "True",
          }
        ],
        action: "block_response",
        statusCode: 423,
        headers: [{ key: "Content-Type", value: "application/json" }],
        bodyType: "application/json",
        body: '{"message": "Session locked: unauthorized proxy tunnel"}'
      }
    ]
  },
  {
    id: "multi_tier_perimeter",
    name: "Multi-Status Perimeter Shield",
    description: "Granular multi-status defense: 429 for velocity spikes (>50 req/min), 403 for blocklisted IPs, 403 for automated bots, and stealth 404 for VPN connections.",
    tags: ["Bot Mitigation", "Velocity Defense", "Multi-Status", "Account Protection"],
    rules: [
      {
        id: "step_mt_vel",
        name: "Request Velocity > 50 / min",
        stepNumber: 2,
        enabled: true,
        conditions: [
          {
            id: "cond_mt_vel",
            field: "velocity",
            operator: "greater_than",
            value: "50",
          }
        ],
        action: "block_response",
        statusCode: 429,
        headers: [
          { key: "Content-Type", value: "application/json" },
          { key: "Retry-After", value: "60" }
        ],
        bodyType: "application/json",
        body: '{"message": "Too many requests. Velocity threshold exceeded (50 req/min). Please slow down and try again.", "status": 429}'
      },
      {
        id: "step_mt_ip",
        name: "IP Blocklist is True",
        stepNumber: 3,
        enabled: true,
        conditions: [
          {
            id: "cond_mt_ip",
            field: "ip_blocklist",
            operator: "is",
            value: "True",
          }
        ],
        action: "block_response",
        statusCode: 403,
        headers: [{ key: "Content-Type", value: "application/json" }],
        bodyType: "application/json",
        body: '{"message": "You are not allowed to visit this resource", "status": 403}'
      },
      {
        id: "step_mt_bot",
        name: "Browser Bot is Bad",
        stepNumber: 4,
        enabled: true,
        conditions: [
          {
            id: "cond_mt_bot",
            field: "bot_threat",
            operator: "is",
            value: "Bad",
          }
        ],
        action: "block_response",
        statusCode: 403,
        headers: [{ key: "Content-Type", value: "application/json" }],
        bodyType: "application/json",
        body: '{"message": "Forbidden: Automated bot signature detected", "status": 403}'
      },
      {
        id: "step_mt_vpn",
        name: "VPN is True",
        stepNumber: 5,
        enabled: true,
        conditions: [
          {
            id: "cond_mt_vpn",
            field: "vpn",
            operator: "is",
            value: "True",
          }
        ],
        action: "block_response",
        statusCode: 404,
        headers: [{ key: "Content-Type", value: "text/html" }],
        bodyType: "text/html",
        body: '<!DOCTYPE html>\n<html>\n<head><title>404 Not Found</title></head>\n<body style="font-family:sans-serif;text-align:center;padding:80px 20px;color:#334155;">\n  <h1 style="font-size:32px;font-weight:700;">404 Not Found</h1>\n  <p>The requested resource was not found on this server.</p>\n</body>\n</html>'
      }
    ]
  }
];

export interface VisitorEvaluationContext {
  isBadBot: boolean;
  isAutomatedBot?: boolean;
  isVpn: boolean;
  isDatacenter: boolean;
  isTor: boolean;
  isProxy: boolean;
  isVelocitySpike: boolean;
  velocityCount?: number;
  deviceId?: string;
  visitorId?: string;
  isIpBlocked: boolean;
  isDevtools: boolean;
  countryCode: string;
  allowedCountries: string[];
}

export interface RuleEvaluationResult {
  matched: boolean;
  ruleName?: string;
  rulesetName?: string;
  responseMode?: "multi" | "single";
  action: RuleAction;
  statusCode: number;
  headers: RuleHeader[];
  bodyType: "application/json" | "text/html" | "text/plain";
  body: string;
  redirectUrl?: string;
  reason?: string;
}

// Authoritative single-condition evaluator
export function evaluateCondition(
  cond: RuleCondition,
  ctx: VisitorEvaluationContext
): boolean {
  switch (cond.field) {
    case "bot_threat": {
      const isBot = ctx.isBadBot || Boolean(ctx.isAutomatedBot);
      return cond.operator === "is_not" ? !isBot : isBot;
    }

    case "vpn": {
      const isVpn = ctx.isVpn;
      if (cond.operator === "is_not" || cond.value === "False") {
        return !isVpn;
      }
      return isVpn;
    }

    case "datacenter": {
      const isDch = ctx.isDatacenter;
      if (cond.operator === "is_not" || cond.value === "False") {
        return !isDch;
      }
      return isDch;
    }

    case "country": {
      const visitorCountry = (ctx.countryCode || "").trim().toUpperCase();
      const isCountryInAllowedList: boolean = Boolean(
        !ctx.allowedCountries ||
        ctx.allowedCountries.length === 0 || 
        ctx.allowedCountries.includes("ALL") || 
        (visitorCountry && ctx.allowedCountries.includes(visitorCountry))
      );

      const targetVal = (cond.value || "").trim().toUpperCase();

      if (cond.operator === "not_in") {
        if (targetVal === "NOT ALLOWED" || targetVal === "RESTRICTED") {
          return !isCountryInAllowedList;
        }
        const codes = targetVal.split(",").map((s) => s.trim()).filter(Boolean);
        return codes.length > 0 ? !codes.includes(visitorCountry) : !isCountryInAllowedList;
      } else if (cond.operator === "in") {
        if (targetVal === "ALLOWED" || targetVal === "ALL") {
          return isCountryInAllowedList;
        }
        const codes = targetVal.split(",").map((s) => s.trim()).filter(Boolean);
        return codes.length > 0 ? codes.includes(visitorCountry) : isCountryInAllowedList;
      } else if (cond.operator === "is") {
        if (targetVal === "NOT ALLOWED" || targetVal === "RESTRICTED") {
          return !isCountryInAllowedList;
        }
        return visitorCountry === targetVal;
      } else if (cond.operator === "is_not") {
        if (targetVal === "NOT ALLOWED" || targetVal === "RESTRICTED") {
          return isCountryInAllowedList;
        }
        return visitorCountry !== targetVal;
      }
      return !isCountryInAllowedList;
    }

    case "velocity": {
      const isVel = ctx.isVelocitySpike;
      // Support numeric threshold comparison (e.g. greater than 50 or is 50 requests/min)
      const numVal = parseInt(cond.value, 10);
      if (!isNaN(numVal) && ctx.velocityCount !== undefined) {
        if (cond.operator === "greater_than") {
          return ctx.velocityCount > numVal;
        }
        if (cond.operator === "is") {
          return ctx.velocityCount >= numVal;
        }
      }
      return cond.operator === "is_not" ? !isVel : isVel;
    }

    case "ip_blocklist": {
      const isBlocked = ctx.isIpBlocked;
      if (cond.operator === "is_not" || cond.value === "False") {
        return !isBlocked;
      }
      return isBlocked;
    }

    case "tor_proxy": {
      const isTorOrProxy = ctx.isTor || ctx.isProxy;
      if (cond.operator === "is_not" || cond.value === "False") {
        return !isTorOrProxy;
      }
      return isTorOrProxy;
    }

    case "devtools": {
      const isDev = ctx.isDevtools;
      if (cond.operator === "is_not" || cond.value === "False") {
        return !isDev;
      }
      return isDev;
    }

    default:
      return false;
  }
}

// Authoritative rule evaluator used across API ingress and live integrations
export function evaluateVisitorRules(
  rulesets: Ruleset[],
  ctx: VisitorEvaluationContext
): RuleEvaluationResult {
  const activeRulesets = (rulesets || []).filter((rs) => rs.enabled);

  for (const ruleset of activeRulesets) {
    const activeRules = (ruleset.rules || []).filter((r) => r.enabled);

    for (const rule of activeRules) {
      if (!rule.conditions || rule.conditions.length === 0) continue;

      // Compound evaluation supporting AND / OR chaining
      // Condition 0 is the starting evaluation.
      // Each subsequent condition has its logicalOp (default "AND") connecting it to previous expression.
      let ruleMatches = evaluateCondition(rule.conditions[0], ctx);

      for (let i = 1; i < rule.conditions.length; i++) {
        const cond = rule.conditions[i];
        const condResult = evaluateCondition(cond, ctx);
        const op = cond.logicalOp || "AND";

        if (op === "OR") {
          ruleMatches = ruleMatches || condResult;
        } else {
          ruleMatches = ruleMatches && condResult;
        }
      }

      if (ruleMatches) {
        // Support Single Status (Unified response across all rules) vs Multi-Status (Per-rule response)
        const isSingleMode = ruleset.responseMode === "single" && Boolean(ruleset.singleResponse);
        const effectiveAction = isSingleMode ? ruleset.singleResponse!.action : rule.action;
        const effectiveStatusCode = isSingleMode ? ruleset.singleResponse!.statusCode : (rule.statusCode || 403);
        const effectiveHeaders = isSingleMode ? ruleset.singleResponse!.headers : (rule.headers || []);
        const effectiveBodyType = isSingleMode ? ruleset.singleResponse!.bodyType : (rule.bodyType || "application/json");
        const effectiveBody = isSingleMode ? ruleset.singleResponse!.body : (rule.body || '{"message": "Blocked by rule"}');
        const effectiveRedirectUrl = isSingleMode ? ruleset.singleResponse!.redirectUrl : rule.redirectUrl;

        return {
          matched: true,
          ruleName: rule.name,
          rulesetName: ruleset.name,
          responseMode: ruleset.responseMode || "multi",
          action: effectiveAction,
          statusCode: effectiveStatusCode,
          headers: effectiveHeaders,
          bodyType: effectiveBodyType,
          body: effectiveBody,
          redirectUrl: effectiveRedirectUrl,
          reason: `${ruleset.name}: ${rule.name}`,
        };
      }
    }
  }

  return {
    matched: false,
    action: "allow",
    statusCode: 200,
    headers: [],
    bodyType: "application/json",
    body: "",
  };
}
