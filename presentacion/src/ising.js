import { J, JUSTICES } from "./data.js";

const N = 9;
const NUM = 1 << N;

function allSpins() {
  const states = new Array(NUM);
  for (let s = 0; s < NUM; s++) {
    const spins = new Array(N);
    for (let i = 0; i < N; i++) spins[i] = (s >> i) & 1 ? 1 : -1;
    states[s] = spins;
  }
  return states;
}

export const STATES = allSpins();

export function spinsToIndex(spins) {
  let s = 0;
  for (let i = 0; i < N; i++) if (spins[i] === 1) s |= 1 << i;
  return s;
}

export function energy(spins, couplings = J) {
  let e = 0;
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      e -= couplings[i][j] * spins[i] * spins[j];
    }
  }
  return e;
}

function buildDistribution(couplings = J) {
  const energies = STATES.map((spins) => energy(spins, couplings));
  let maxLog = -Infinity;
  const logW = new Array(NUM);
  for (let s = 0; s < NUM; s++) {
    logW[s] = -energies[s];
    if (logW[s] > maxLog) maxLog = logW[s];
  }
  let z = 0;
  const weights = new Array(NUM);
  for (let s = 0; s < NUM; s++) {
    weights[s] = Math.exp(logW[s] - maxLog);
    z += weights[s];
  }
  const P = weights.map((w) => w / z);
  const logZ = maxLog + Math.log(z);
  return { energies, P, logZ, Z: Math.exp(logZ) };
}

const MODEL = buildDistribution();

export function probability(spins) {
  return MODEL.P[spinsToIndex(spins)];
}

export function relativeToUnanimous(spins) {
  const pUni = MODEL.P[spinsToIndex([1, 1, 1, 1, 1, 1, 1, 1, 1])];
  return probability(spins) / pUni;
}

export function majoritySize(spins) {
  const plus = spins.filter((x) => x === 1).length;
  return Math.max(plus, N - plus);
}

export function majoritySplit(spins) {
  const k = majoritySize(spins);
  return `${k}–${N - k}`;
}

export function valleyName(spins) {
  const plus = spins.filter((x) => x === 1).length;
  const allSame = plus === 0 || plus === 9;
  if (allSame) return "Valle unánime";

  const liberal = [0, 1, 2, 3];
  const conservative = [4, 5, 6, 7, 8];
  const libSign = Math.sign(liberal.reduce((a, i) => a + spins[i], 0));
  const conSign = Math.sign(conservative.reduce((a, i) => a + spins[i], 0));
  const blocSplit =
    libSign !== 0 &&
    conSign !== 0 &&
    libSign !== conSign &&
    liberal.every((i) => spins[i] === libSign) &&
    conservative.every((i) => spins[i] === conSign);
  if (blocSplit) return "Valle ideológico 5–4";

  const asCt = spins[7] === spins[8];
  const rest = spins.slice(0, 7);
  const restSame = rest.every((x) => x === rest[0]);
  if (asCt && restSame && spins[7] !== rest[0]) return "Valle 7–2 (Scalia–Thomas)";

  return "Estado ruidoso cerca de un prototipo";
}

export function flipDeltas(spins) {
  const e0 = energy(spins);
  return JUSTICES.map((_, i) => {
    const next = spins.slice();
    next[i] *= -1;
    return energy(next) - e0;
  });
}

export function isLocalMinimum(spins) {
  return flipDeltas(spins).every((d) => d >= -1e-9);
}

export function patternString(spins) {
  return spins.map((s) => (s === 1 ? "+" : "−")).join("");
}

export { MODEL };
