export function getJwtExp(token: string): number | undefined {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp;
  } catch {
    return undefined;
  }
}
