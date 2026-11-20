'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { readConfig, createGeminiClient } = require('./llm');

class ApplicationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ApplicationError';
  }
}

const allowedCategories = new Set([
  'billing',
  'technical',
  'account',
  'feature_request',
  'complaint',
  'other',
]);
const allowedPriorities = new Set(['P1', 'P2', 'P3', 'P4']);
const allowedSentiments = new Set(['positive', 'neutral', 'negative']);
const expectedKeys = [
  'category',
  'priority',
  'sentiment',
  'needs_clarification',
  'clarification_question',
  'escalate',
  'summary',
  'suggested_action',
];

function parseAndValidate(text) {
  let value;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new ApplicationError('Invalid JSON');
  }

  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new ApplicationError('Invalid triage object');
  }

  const keys = Object.keys(value);
  if (
    keys.length !== expectedKeys.length ||
    expectedKeys.some((key) => !Object.prototype.hasOwnProperty.call(value, key))
  ) {
    throw new ApplicationError('Invalid triage schema');
  }

  if (!allowedCategories.has(value.category)) {
    throw new ApplicationError('Invalid triage category');
  }
  if (!allowedPriorities.has(value.priority)) {
    throw new ApplicationError('Invalid triage priority');
  }
  if (!allowedSentiments.has(value.sentiment)) {
    throw new ApplicationError('Invalid triage sentiment');
  }
  if (typeof value.needs_clarification !== 'boolean') {
    throw new ApplicationError('Invalid clarification type');
  }
  if (typeof value.escalate !== 'boolean') {
    throw new ApplicationError('Invalid escalation type');
  }
  if (typeof value.summary !== 'string' || value.summary.length > 200) {
    throw new ApplicationError('Invalid summary');
  }
  if (typeof value.suggested_action !== 'string') {
    throw new ApplicationError('Invalid suggested action');
  }

  if (value.needs_clarification) {
    if (
      typeof value.clarification_question !== 'string' ||
      value.clarification_question.trim() === ''
    ) {
      throw new ApplicationError('Clarification question is required');
    }
  } else if (value.clarification_question !== null) {
    throw new ApplicationError('Clarification question must be null');
  }

  return value;
}

async function triage(emailText, dependencies) {
  const projectRoot = path.resolve(__dirname, '..');
  const systemPrompt = fs.readFileSync(
    path.join(projectRoot, 'prompts', 'triage.system.md'),
    'utf8',
  );

  let generateContent;
  if (dependencies && typeof dependencies.generateContent === 'function') {
    generateContent = dependencies.generateContent;
  } else {
    const config = readConfig(process.env);
    const client = createGeminiClient();
    generateContent = async (text, options) => client.generateContent({
      apiKey: config.apiKey,
      model: config.model,
      systemPrompt: options.systemPrompt,
      emailText: text,
    });
  }

  const generated = await generateContent(emailText, { systemPrompt });
  return parseAndValidate(generated);
}

module.exports = {
  ApplicationError,
  parseAndValidate,
  triage,
};
