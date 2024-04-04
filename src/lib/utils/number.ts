export function truncateNumber(num: number, decimals: number): number {
  const re = new RegExp("(\\d+\\.\\d{" + decimals + "})(\\d)"),
    m = num.toString().match(re);
  return m ? parseFloat(m[1]) : num.valueOf();
}

/**
 * Compute an exponential moving average
 */
export function exponentialMovingAverage(current: number, avg: number | undefined, window: number): number {
  return (current + (avg || 0) * (window - 1)) / window;
}

/**
 * Compute an exponential moving average for unevenly spaced samples
 */
export function irregularExponentialMovingAverage(current: number, avg: number, dt: number, window: number): number {
  return (current * dt + avg * (window - dt)) / window;
}

/**
 * Correct generalization of the modulo operator to negative numbers
 */
export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}
