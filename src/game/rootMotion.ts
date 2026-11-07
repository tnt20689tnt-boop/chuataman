export function stabilizeRootPositionTrack(
  values: Float32Array,
  times: ArrayLike<number>,
  stride: number,
  removeVerticalDrift: boolean,
): void {
  if (stride < 3 || values.length < stride) return;

  const keyCount = Math.floor(values.length / stride);
  const firstX = values[0] ?? 0;
  const firstY = values[1] ?? 0;
  const firstZ = values[2] ?? 0;
  const lastY = values[(keyCount - 1) * stride + 1] ?? firstY;
  const firstTime = times[0] ?? 0;
  const lastTime = times[keyCount - 1] ?? firstTime;
  const timeSpan = lastTime - firstTime;
  const verticalDrift = lastY - firstY;

  for (let key = 0; key < keyCount; key++) {
    const index = key * stride;
    const keyTime = times[key] ?? (keyCount > 1 ? key / (keyCount - 1) : 0);
    const progress =
      timeSpan > 0 ? (keyTime - firstTime) / timeSpan : keyCount > 1 ? key / (keyCount - 1) : 0;

    values[index] = firstX;
    if (removeVerticalDrift) {
      values[index + 1] = (values[index + 1] ?? firstY) - verticalDrift * progress;
    }
    values[index + 2] = firstZ;
  }
}
