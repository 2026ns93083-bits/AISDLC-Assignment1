'use strict';

function decimalToRational(value) {
  const text = typeof value === 'string' ? value : String(value);
  const match = text.match(/^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))$/);
  if (!match) {
    throw new TypeError('Expected a finite decimal value.');
  }

  const sign = match[1] === '-' ? -1n : 1n;
  const integerPart = match[2] || '0';
  const fractionalPart = match[3] ?? match[4] ?? '';
  const digits = `${integerPart}${fractionalPart}`;
  const numerator = sign * BigInt(digits || '0');
  const denominator = 10n ** BigInt(fractionalPart.length);
  return { numerator, denominator };
}

function greatestCommonDivisor(left, right) {
  let a = left < 0n ? -left : left;
  let b = right < 0n ? -right : right;

  while (b !== 0n) {
    [a, b] = [b, a % b];
  }
  return a;
}

function powBigInt(base, exponent) {
  let result = 1n;
  let factor = base;
  let power = exponent;

  while (power > 0) {
    if (power % 2 === 1) {
      result *= factor;
    }
    factor *= factor;
    power = Math.floor(power / 2);
  }
  return result;
}

function roundRatioHalfUp(numerator, denominator) {
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  return quotient + (remainder * 2n >= denominator ? 1n : 0n);
}

function toCents(value) {
  const { numerator, denominator } = decimalToRational(value);
  const scaledNumerator = numerator * 100n;
  if (scaledNumerator % denominator !== 0n) {
    throw new RangeError('Principal must be an exact amount of cents.');
  }
  return scaledNumerator / denominator;
}

function toAmount(cents) {
  return Number(cents) / 100;
}

function calculateEmi(principal, annualRate, tenure) {
  const principalCents = toCents(principal);
  const annualRateRatio = decimalToRational(annualRate);
  if (annualRateRatio.numerator < 0n) {
    throw new RangeError('Annual rate must not be negative.');
  }

  let monthlyNumerator = annualRateRatio.numerator;
  let monthlyDenominator = annualRateRatio.denominator * 1200n;
  const divisor = greatestCommonDivisor(monthlyNumerator, monthlyDenominator);
  monthlyNumerator /= divisor;
  monthlyDenominator /= divisor;

  const regularEmiCents = monthlyNumerator === 0n
    ? roundRatioHalfUp(principalCents, BigInt(tenure))
    : (() => {
        const growth = monthlyDenominator + monthlyNumerator;
        const growthPower = powBigInt(growth, tenure);
        const denominatorPower = powBigInt(monthlyDenominator, tenure);
        const emiNumerator = principalCents * monthlyNumerator * growthPower;
        const emiDenominator = monthlyDenominator * (growthPower - denominatorPower);
        return roundRatioHalfUp(emiNumerator, emiDenominator);
      })();

  const schedule = [];
  let balanceCents = principalCents;
  let totalInterestCents = 0n;
  let totalPaymentCents = 0n;

  for (let month = 1; month <= tenure; month += 1) {
    const interestCents = roundRatioHalfUp(
      balanceCents * monthlyNumerator,
      monthlyDenominator
    );
    const isFinalMonth = month === tenure;
    const principalPaidCents = isFinalMonth
      ? balanceCents
      : regularEmiCents - interestCents;
    const paymentCents = principalPaidCents + interestCents;
    balanceCents -= principalPaidCents;
    totalInterestCents += interestCents;
    totalPaymentCents += paymentCents;

    schedule.push({
      month,
      emi: toAmount(paymentCents),
      interest: toAmount(interestCents),
      principal: toAmount(principalPaidCents),
      balance: toAmount(balanceCents)
    });
  }

  return {
    emi: toAmount(regularEmiCents),
    total_interest: toAmount(totalInterestCents),
    total_payment: toAmount(totalPaymentCents),
    schedule
  };
}

function roundHalfUp(value) {
  const { numerator, denominator } = decimalToRational(value);
  const sign = numerator < 0n ? -1n : 1n;
  const cents = roundRatioHalfUp(
    numerator < 0n ? -numerator * 100n : numerator * 100n,
    denominator
  );
  return toAmount(sign * cents);
}

module.exports = { calculateEmi, roundHalfUp };
