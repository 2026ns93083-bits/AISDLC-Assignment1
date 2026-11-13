'use strict';

const DECIMAL_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;

function validationError(code, message) {
  return { error: { code, message } };
}

function parseFiniteDecimal(value) {
  if (typeof value !== 'string' || !DECIMAL_PATTERN.test(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validateInput(args) {
  if (!Array.isArray(args) || args.length !== 3) {
    return validationError(
      'INVALID_ARGUMENT_COUNT',
      'Expected exactly three positional arguments: principal, annual rate, and tenure.'
    );
  }

  const [principalText, rateText, tenureText] = args;
  const principal = parseFiniteDecimal(principalText);
  if (principal === null) {
    return validationError('INVALID_PRINCIPAL', 'Principal must be a finite decimal value.');
  }

  const principalFraction = principalText.match(/\.(\d*)$/);
  if (principalFraction && principalFraction[1].length > 2) {
    return validationError(
      'INVALID_PRINCIPAL',
      'Principal must have no more than two fractional digits.'
    );
  }
  if (principal < 1 || principal > 100000000) {
    return validationError(
      'INVALID_PRINCIPAL',
      'Principal must be between 1 and 100000000 inclusive.'
    );
  }

  const annualRate = parseFiniteDecimal(rateText);
  if (annualRate === null) {
    return validationError('INVALID_RATE', 'Annual rate must be a finite decimal value.');
  }
  if (annualRate < 0 || annualRate > 50) {
    return validationError('INVALID_RATE', 'Annual rate must be between 0 and 50 inclusive.');
  }

  const tenure = parseFiniteDecimal(tenureText);
  if (tenure === null || !Number.isInteger(tenure) || tenure < 1 || tenure > 480) {
    return validationError(
      'INVALID_TENURE',
      'Tenure must be a whole number of months between 1 and 480 inclusive.'
    );
  }

  return { principal: principalText, annualRate: rateText, tenure };
}

module.exports = { validateInput };
