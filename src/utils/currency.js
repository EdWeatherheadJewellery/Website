// Formats a number of dollars as "$123.00 AUD" — spelling out the currency
// code (rather than just "$") is standard practice for Australian checkouts,
// since "$" alone is ambiguous to international customers.
const formatter = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
});

export function formatAUD(amount) {
  return `${formatter.format(Number(amount) || 0)} AUD`;
}
