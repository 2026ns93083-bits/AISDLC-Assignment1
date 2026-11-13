'use strict';

const DECIMAL_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;

function validationError(code, message) {
  return { error: { code, message } };
}

function parseDecimal(value) {
  if (typeof value !== 'string' || !DECIMAL_PATTERN.test(value)) {
    return null;
  }

  const unsignedValue = value.replace(/^[+-]/, '');
  const [integerText = '0', fractional = ''] = unsignedValue.split('.');
  return {
    negative: value.startsWith('-'),
    integer: BigInt(integerText || '0'),
    fractional
  };
}

function compareDecimalToInteger(value, limit) {
  if (
    value.negative
    && (value.integer !== 0n || /[1-9]/.test(value.fractional))
  ) {
    return -1;
  }

  const limitBigInt = BigInt(limit);
  let comparison = value.integer < limitBigInt ? -1 : value.integer > limitBigInt ? 1 : 0;

  if (comparison === 0 && /[1-9]/.test(value.fractional)) {
    comparison = 1;
  }

  return comparison;
}

function validateInput(args) {
  if (!Array.isArray(args) || args.length !== 3) {
    return validationError(
      'INVALID_ARGUMENT_COUNT',
      'Expected exactly three positional arguments: principal, annual rate, and tenure.'
    );
  }

  const [principalText, rateText, tenureText] = args;
  const principal = parseDecimal(principalText);
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
  if (
    compareDecimalToInteger(principal, 1) < 0
    || compareDecimalToInteger(principal, 100000000) > 0
  ) {
    return validationError(
      'INVALID_PRINCIPAL',
      'Principal must be between 1 and 100000000 inclusive.'
    );
  }

  const annualRate = parseDecimal(rateText);
  if (annualRate === null) {
    return validationError('INVALID_RATE', 'Annual rate must be a finite decimal value.');
  }
  if (compareDecimalToInteger(annualRate, 0) < 0 || compareDecimalToInteger(annualRate, 50) > 0) {
    return validationError('INVALID_RATE', 'Annual rate must be between 0 and 50 inclusive.');
  }

  const tenure = parseDecimal(tenureText);
  if (
    tenure === null
    || /[1-9]/.test(tenure.fractional)
    || compareDecimalToInteger(tenure, 1) < 0
    || compareDecimalToInteger(tenure, 480) > 0
  ) {
    return validationError(
      'INVALID_TENURE',
      'Tenure must be a whole number of months between 1 and 480 inclusive.'
    );
  }

  const normalizedTenure = Number(tenure.integer) * (tenure.negative ? -1 : 1);
  return { principal: principalText, annualRate: rateText, tenure: normalizedTenure };
}

module.exports = { validateInput };
