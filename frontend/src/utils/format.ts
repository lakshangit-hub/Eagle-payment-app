export function formatMoney(amount: number): string {
  return (
    'Rs. ' +
    Number(amount).toLocaleString('en-LK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export function formatDateGB(isoOrDate: string | Date): string {
  try {
    const d = new Date(isoOrDate);
    if (isNaN(d.getTime())) return String(isoOrDate);
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(isoOrDate);
  }
}
