export function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export function normalizeBatch(value: string) {
  return value.trim().replace(/\s+/g, " ");
}
