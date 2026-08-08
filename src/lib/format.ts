// French currency: "2 890 €" or "11,80 €" with narrow non-breaking space.
const NNBSP = " ";

export function formatEUR(amount: number): string {
  const hasCents = Math.round(amount * 100) % 100 !== 0;
  const decimals = hasCents ? 2 : 0;
  const grouped = amount
    .toLocaleString("fr-FR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
    .replace(/\s| /g, NNBSP);
  return `${grouped}${NNBSP}€`;
}

