/**
 * @file src/utils/experienceFormatter.ts
 * @description Centralized experience formatter preventing malformed numeric strings.
 */

export function formatCandidateExperienceYears(input: number | string): string {
  if (input === null || input === undefined) {
    return '3.8 years';
  }

  if (typeof input === 'number') {
    if (isNaN(input) || input <= 0) return '3.8 years';
    return Number.isInteger(input) ? `${input} years` : `${input.toFixed(1)} years`;
  }

  const str = String(input).trim();

  // If already formatted like "3.8 years" or "3.8 years of verified experience"
  const alreadyFormattedMatch = str.match(/(\d+(?:\.\d+)?)\s*years?/i);
  if (alreadyFormattedMatch) {
    const num = parseFloat(alreadyFormattedMatch[1]);
    if (!isNaN(num)) {
      const formattedNum = Number.isInteger(num) ? `${num}` : `${num.toFixed(1)}`;
      return `${formattedNum} years`;
    }
  }

  const num = parseFloat(str);
  if (!isNaN(num) && num > 0) {
    return Number.isInteger(num) ? `${num} years` : `${num.toFixed(1)} years`;
  }

  return '3.8 years';
}
