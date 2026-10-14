// Pure derivation: parsed source files + lock -> dataset entries.
// No network, no clock. Every value comes from the inputs or the lock.

import { orderBySchema } from './json.mjs';
import { loadSchema } from './schema.mjs';

export const AUTOMATION_RULE = 'decision-table-v1';
export const SEED_RULE =
  'WCAG 2.1 level A and AA criteria ranked by the number of approved ACT rules that map to them for conformance ' +
  'and have at least one automated implementation with consistency "complete"; ties broken by clause number; criteria with 0 are not ranked.';

// ACT rule permalinks are relative to the WAI website.
const ACT_RULE_BASE = 'https://www.w3.org/WAI';

// Implementation types from act-implementations.yml. Only automated types count as automation.
const AUTOMATED_TYPES = new Map([
  ['automated tool', true],
  ['linter', true],
  ['semi-automated tool', false],
  ['test methodology', false],
]);

const schema = loadSchema();

export function compareClause(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? -1) - (pb[i] ?? -1);
    if (d !== 0) return d;
  }
  return 0;
}

function unquote(value) {
  return value.replace(/^(["'])(.*)\1$/, '$2');
}

// Reads uniqueKey and type of each implementation from act-implementations.yml.
// Only that flat subset of YAML is supported; anything unexpected throws.
export function parseImplementationTypes(yml) {
  const items = [];
  for (const line of yml.split(/\r?\n/)) {
    if (line.trim() === '' || /^\s*#/.test(line)) continue;
    if (line.startsWith('- ')) items.push({});
    const match = line.match(/^(?:- |\s+)(uniqueKey|type):\s*(.*?)\s*$/);
    if (match) {
      if (items.length === 0) throw new Error(`act-implementations.yml: "${match[1]}" outside a list item`);
      items.at(-1)[match[1]] = unquote(match[2]);
    }
  }
  const types = {};
  for (const item of items) {
    if (!item.uniqueKey || !item.type) throw new Error(`act-implementations.yml: item without uniqueKey or type: ${JSON.stringify(item)}`);
    types[item.uniqueKey] = item.type;
  }
  return types;
}

export function isAutomatedType(type) {
  const automated = AUTOMATED_TYPES.get(String(type).toLowerCase());
  if (automated === undefined) throw new Error(`Unknown implementation type "${type}"; classify it in scripts/lib/derive.mjs`);
  return automated;
}

export function wcagCriteria(wcag) {
  const criteria = new Map();
  for (const principle of wcag.principles) {
    for (const guideline of principle.guidelines) {
      for (const sc of guideline.successcriteria) {
        criteria.set(sc.num, { num: sc.num, id: sc.id, handle: sc.handle, level: sc.level, versions: sc.versions });
      }
    }
  }
  return criteria;
}

// Accessibility requirements of an ACT rule that map to a WCAG 2.0/2.1 criterion for conformance.
// Secondary requirements are excluded.
export function conformanceRequirements(rule) {
  const out = new Map();
  for (const [key, value] of Object.entries(rule.frontmatter?.accessibility_requirements ?? {})) {
    const match = key.match(/^wcag2[01]:(\d+\.\d+\.\d+)$/);
    if (match && value && value.forConformance === true) out.set(match[1], value);
  }
  return out;
}

// Implementations by automated tools with consistency complete or partial.
function automatedImplementations(ruleId, ctx) {
  const out = [];
  for (const [tool, report] of Object.entries(ctx.inputs.implementations)) {
    if (!ctx.automated.get(tool)) continue;
    for (const mapping of report.actRuleMapping) {
      if (mapping.ruleId !== ruleId) continue;
      if (mapping.consistency !== 'complete' && mapping.consistency !== 'partial') continue;
      out.push({
        tool,
        version: report.version === undefined || report.version === null ? null : String(report.version),
        procedures: mapping.procedureNames,
        consistency: mapping.consistency,
      });
    }
  }
  return out;
}

function createContext(inputs) {
  const types = parseImplementationTypes(inputs.implementationsYml);
  const automated = new Map();
  for (const tool of Object.keys(inputs.implementations)) {
    if (!(tool in types)) throw new Error(`Implementation report ${tool}.json has no entry in act-implementations.yml`);
    automated.set(tool, isAutomatedType(types[tool]));
  }
  for (const rule of inputs.actMapping['act-rules']) {
    for (const report of Object.values(inputs.implementations)) {
      for (const mapping of report.actRuleMapping) {
        if (mapping.ruleId === rule.frontmatter.id && mapping.ruleApproved !== !rule.proposed) {
          throw new Error(`ACT rule ${rule.frontmatter.id}: ruleApproved in ${report.name} disagrees with wcag-mapping.json`);
        }
      }
    }
  }
  return { inputs, criteria: wcagCriteria(inputs.wcag), automated };
}

// Non-deprecated ACT rules mapped to the criterion for conformance, with their automated implementations.
function actRulesFor(num, ctx) {
  return ctx.inputs.actMapping['act-rules']
    .filter((rule) => !rule.deprecated && conformanceRequirements(rule).has(num))
    .map((rule) => ({
      rule,
      requirement: conformanceRequirements(rule).get(num),
      implementations: automatedImplementations(rule.frontmatter.id, ctx),
    }))
    .sort((a, b) => (a.rule.frontmatter.id < b.rule.frontmatter.id ? -1 : 1));
}

export function rankCriteria(inputs) {
  const ctx = createContext(inputs);
  const ranking = [];
  for (const sc of ctx.criteria.values()) {
    if (sc.level !== 'A' && sc.level !== 'AA') continue;
    const count = actRulesFor(sc.num, ctx).filter(
      (r) => !r.rule.proposed && r.implementations.some((i) => i.consistency === 'complete'),
    ).length;
    if (count > 0) ranking.push({ clause: `9.${sc.num}`, sc: sc.num, count });
  }
  return ranking.sort((a, b) => b.count - a.count || compareClause(a.clause, b.clause));
}

export function classifyAutomation(actRules) {
  const approved = actRules.filter((r) => !r.rule.proposed);
  const basis = (rules, consistencies) => ({
    rule: AUTOMATION_RULE,
    act_rules: rules.map((r) => r.rule.frontmatter.id).sort(),
    tools: [...new Set(rules.flatMap((r) => r.implementations.filter((i) => consistencies.includes(i.consistency)).map((i) => i.tool)))].sort(),
  });

  const satisfying = approved.filter(
    (r) => r.requirement.passed === 'satisfied' && r.implementations.some((i) => i.consistency === 'complete'),
  );
  if (satisfying.length > 0) return { automation: 'automatable', basis: basis(satisfying, ['complete']) };

  const implemented = approved.filter((r) => r.implementations.length > 0);
  if (implemented.length > 0) return { automation: 'partial', basis: basis(implemented, ['complete', 'partial']) };

  return { automation: 'manual', basis: { rule: AUTOMATION_RULE, act_rules: [], tools: [] } };
}

function engineRows(clause, actRules, ctx) {
  const rows = new Map();
  for (const { rule, implementations } of actRules) {
    for (const impl of implementations) {
      if (impl.procedures.length === 0) {
        throw new Error(`${impl.tool}: ACT rule ${rule.frontmatter.id} is ${impl.consistency} but lists no procedure`);
      }
      for (const procedure of impl.procedures) {
        const row = {
          engine: impl.tool,
          engine_version: impl.version,
          rule_id: procedure,
          via: 'act-implementation',
          act_rule_id: rule.frontmatter.id,
          consistency: impl.consistency,
        };
        rows.set(JSON.stringify(row), row);
      }
    }
  }
  for (const axeRule of ctx.inputs.axeRules) {
    const tags = axeRule.tags ?? [];
    if (!tags.includes(`EN-${clause}`)) continue;
    if (axeRule.enabled === false || tags.includes('deprecated') || tags.includes('experimental')) continue;
    const row = {
      engine: 'axe-core',
      engine_version: ctx.inputs.axeVersion,
      rule_id: axeRule.id,
      via: 'engine-tags',
      act_rule_id: null,
      consistency: null,
    };
    rows.set(JSON.stringify(row), row);
  }
  const key = (r) => [r.via, r.engine, r.rule_id, r.act_rule_id ?? ''].join('\u0000');
  return [...rows.values()].sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
}

function nullReasons(engines) {
  const reasons = {
    manual_test: 'Manual test steps are a planned milestone and are not part of the seed.',
  };
  if (engines.some((e) => e.via === 'engine-tags')) {
    reasons['engines[via=engine-tags].act_rule_id'] =
      'Rows from engine tags come from the EN-9.x.y.z tag in the engine rule file, not from an ACT implementation report.';
    reasons['engines[via=engine-tags].consistency'] =
      'Consistency is only measured in ACT implementation reports; engine tags are vendor metadata without a consistency result.';
  }
  for (const e of engines) {
    if (e.via === 'act-implementation' && e.engine_version === null) {
      reasons[`engines[engine=${e.engine}].engine_version`] =
        `The ACT implementation report ${e.engine}.json at the pinned commit has no version field.`;
    }
  }
  return reasons;
}

function entrySources(lock) {
  const { act, axe, wcag, etsi_v3_2_1: etsi } = lock.sources;
  const retrieved = lock.pinned_on;
  return [
    { name: act.name, url: act.url, commit_or_version: act.commit, retrieved },
    { name: axe.name, url: axe.url, commit_or_version: axe.tag, retrieved },
    { name: wcag.name, url: wcag.url, commit_or_version: `${wcag.published};sha256=${wcag.sha256}`, retrieved },
    { name: etsi.name, url: etsi.url, commit_or_version: `${etsi.version};${etsi.published}`, retrieved },
  ];
}

const PENDING = Object.freeze({ status: 'pending', reviewer: null, date: null, notes: null });

function derivedKey(entry) {
  const { review, ...derived } = entry;
  return JSON.stringify(orderBySchema(derived, schema));
}

// Keeps the previous review if the derived values are unchanged, otherwise resets it to pending.
export function carryReview(entry, previous) {
  if (!previous || derivedKey(entry) !== derivedKey(previous)) return { ...PENDING };
  const { status, reviewer, date, notes } = previous.review;
  return { status, reviewer, date, notes };
}

function buildEntry(num, ctx, lock) {
  const sc = ctx.criteria.get(num);
  const requirement = ctx.inputs.requirements[`WCAG2:${sc.id}`];
  if (!requirement || requirement.num !== sc.num || requirement.level !== sc.level) {
    throw new Error(`WCAG ${num}: wcag.json and requirements.json disagree on number or level`);
  }
  const clause = `9.${num}`;
  const actRules = actRulesFor(num, ctx);
  const engines = engineRows(clause, actRules, ctx);
  const { automation, basis } = classifyAutomation(actRules);
  return {
    clause,
    en_versions: {
      // V3.2.1: clause 9.x.y.z covers every WCAG 2.1 level A and AA criterion x.y.z.
      '3.2.1': sc.level === 'A' || sc.level === 'AA',
      // Per-clause check against V4.1.1 is a planned milestone.
      '4.1.1': 'unverified',
    },
    title: sc.handle,
    wcag: { sc: sc.num, level: sc.level, versions: sc.versions, understanding_url: requirement.understandingUrl },
    act_rules: actRules.map(({ rule, requirement: req }) => ({
      id: rule.frontmatter.id,
      name: rule.frontmatter.name,
      url: `${ACT_RULE_BASE}${rule.permalink}`,
      approved: !rule.proposed,
      outcomes: { passed: req.passed, failed: req.failed, inapplicable: req.inapplicable },
    })),
    engines,
    automation,
    automation_basis: basis,
    manual_test: null,
    null_reasons: nullReasons(engines),
    sources: entrySources(lock),
  };
}

export function deriveEntries(inputs, lock, previousEntries = []) {
  const ctx = createContext(inputs);
  const previous = new Map(previousEntries.map((e) => [e.clause, e]));
  return rankCriteria(inputs)
    .slice(0, lock.seed_size)
    .map(({ sc }) => buildEntry(sc, ctx, lock))
    .sort((a, b) => compareClause(a.clause, b.clause))
    .map((entry) => orderBySchema({ ...entry, review: carryReview(entry, previous.get(entry.clause)) }, schema));
}
