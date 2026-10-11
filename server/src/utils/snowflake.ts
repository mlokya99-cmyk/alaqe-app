// Snowflake ID generator (Epoch + Node ID + Sequence)
let lastTimestamp = -1n;
let sequence = 0n;
const NODE_ID = 1n; // Can be configured per worker

export function generateSnowflakeId(): string {
  let timestamp = BigInt(Date.now());

  if (timestamp === lastTimestamp) {
    sequence = (sequence + 1n) & 4095n;
    if (sequence === 0n) {
      // Sequence exhausted in current millisecond, wait for next ms
      while (timestamp <= lastTimestamp) {
        timestamp = BigInt(Date.now());
      }
    }
  } else {
    sequence = 0n;
  }

  lastTimestamp = timestamp;

  // Custom epoch: 2026-01-01T00:00:00Z = 1767225600000ms
  const CUSTOM_EPOCH = 1767225600000n;
  const timePart = (timestamp - CUSTOM_EPOCH) << 22n;
  const nodePart = (NODE_ID & 1023n) << 12n;
  const seqPart = sequence & 4095n;

  const id = timePart | nodePart | seqPart;
  return id.toString();
}
