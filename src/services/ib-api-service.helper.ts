/**
 * Convert a [YEAR][MONTH][DAY] string to a date string to a
 * UNIX timestamp.
 */
export function toDateTime(ibkrDateString?: string): number | undefined {
  if (!ibkrDateString) {
    return undefined;
  }
  const year = Number(ibkrDateString.substr(0, 4));
  const month = Number(ibkrDateString.substr(4, 2));
  const day = Number(ibkrDateString.substr(4, 2));
  const hour = Number(ibkrDateString.substr(10, 2));
  const min = Number(ibkrDateString.substr(13, 2));
  const sec = Number(ibkrDateString.substr(16, 2));
  if (!isNaN(sec)) {
    return new Date(year, month - 1, day, hour, min, sec).getTime();
  } else {
    return new Date(year, month - 1, day).getTime();
  }
}
