export function wait_ms(ms: number): Promise<void> {
  return new Promise<void>(res => {
    setTimeout(() => res(), ms);
  });
}
