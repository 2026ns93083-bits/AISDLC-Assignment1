'use strict';
// Structural validator for the eight-field output contract (spec: Output Contract, INV-1, AC-001).
// Written independently of src/ so the harness never trusts the implementation's own validator.

const CATEGORIES = ['billing', 'technical', 'account', 'feature_request', 'complaint', 'other'];
const PRIORITIES = ['P1', 'P2', 'P3', 'P4'];
const SENTIMENTS = ['positive', 'neutral', 'negative'];
const FIELDS = [
  'category', 'priority', 'sentiment', 'needs_clarification',
  'clarification_question', 'escalate', 'summary', 'suggested_action',
];

function validateSchema(obj) {
  const errors = [];
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return ['result is not a JSON object'];
  }
  for (const key of Object.keys(obj)) {
    if (!FIELDS.includes(key)) errors.push(`extra key: ${key}`);
  }
  for (const key of FIELDS) {
    if (!(key in obj)) errors.push(`missing key: ${key}`);
  }
  if (!CATEGORIES.includes(obj.category)) errors.push('category not an allowed value');
  if (!PRIORITIES.includes(obj.priority)) errors.push('priority not an allowed value');
  if (!SENTIMENTS.includes(obj.sentiment)) errors.push('sentiment not an allowed value');
  if (typeof obj.needs_clarification !== 'boolean') errors.push('needs_clarification not boolean');
  if (typeof obj.escalate !== 'boolean') errors.push('escalate not boolean');
  if (typeof obj.summary !== 'string') errors.push('summary not a string');
  if (typeof obj.suggested_action !== 'string') errors.push('suggested_action not a string');
  if (obj.needs_clarification === true) {
    if (typeof obj.clarification_question !== 'string' || obj.clarification_question.trim() === '') {
      errors.push('clarification_question must be a non-empty string when needs_clarification is true');
    }
  } else if (obj.needs_clarification === false) {
    if (obj.clarification_question !== null) {
      errors.push('clarification_question must be null when needs_clarification is false');
    }
  }
  return errors;
}

module.exports = { validateSchema, CATEGORIES, PRIORITIES, SENTIMENTS, FIELDS };
