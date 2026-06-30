class CheckoutOptions {
  constructor({ timeoutMs = 2000, maxRetries = 3, backoffMs = 500 } = {}) {
    this.timeoutMs = timeoutMs;
    this.maxRetries = maxRetries;
    this.backoffMs = backoffMs;
  }
}

module.exports = { CheckoutOptions };