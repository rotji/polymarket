// DDS spike detection for exact bucket/range markets
export function analyzeDDS(structure: any) {
  const { rows } = structure;
  if (rows.length < 3) {
    return {
      distortion: false,
      veto: false,
      rows,
      reason: `Only ${rows.length} bracket(s) — need 3+ for DDS`,
    };
  }
  const yesVals = rows.map((r: any) => r.yes);
  const maxVal = Math.max(...yesVals);
  const maxIdx = yesVals.indexOf(maxVal);
  const neighbors = [];
  if (maxIdx > 0) neighbors.push(yesVals[maxIdx - 1]);
  if (maxIdx < yesVals.length - 1) neighbors.push(yesVals[maxIdx + 1]);
  const avgNeighbor =
    neighbors.length > 0
      ? neighbors.reduce((a, b) => a + b, 0) / neighbors.length
      : 0;
  if (maxVal < 0.35) {
    return {
      distortion: false,
      veto: false,
      rows,
      reason: `Peak too low for robust DDS (${(maxVal * 100).toFixed(0)}% < 35%)`,
    };
  }
  if (avgNeighbor <= 0) {
    return {
      distortion: false,
      veto: false,
      rows,
      reason: "Neighbor average invalid for DDS",
    };
  }
  const dds = maxVal / avgNeighbor;
  if (dds >= 2.5) {
    return {
      distortion: true,
      veto: false,
      type: "DDS spike",
      dds,
      spike: rows[maxIdx],
      rows,
      reason:
        `DDS spike detected — "${rows[maxIdx].question}" at ${(maxVal * 100).toFixed(0)}% ` +
        `vs avg neighbors ${(avgNeighbor * 100).toFixed(0)}% (${dds.toFixed(2)}x)`
    };
  }
  return {
    distortion: false,
    veto: false,
    dds,
    rows,
    reason: `No structural distortion — DDS ${dds.toFixed(2)} below 2.50`,
  };
}
