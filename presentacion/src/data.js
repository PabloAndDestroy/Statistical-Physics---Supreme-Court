export const PAPER = {
  title: "Statistical Mechanics of the US Supreme Court",
  authors: "Edward D. Lee, Chase P. Broedersz y William Bialek",
  year: 2015,
  journal: "Journal of Statistical Physics 160:275–301",
  court: "Segunda Corte Rehnquist",
  period: "1994–2005",
  cases: 895,
  nJustices: 9,
  nStates: 512,
};

export const JUSTICES = [
  { id: "JS", name: "John Paul Stevens", short: "Stevens", wing: "liberal" },
  { id: "RG", name: "Ruth Bader Ginsburg", short: "Ginsburg", wing: "liberal" },
  { id: "DS", name: "David Souter", short: "Souter", wing: "liberal" },
  { id: "SB", name: "Stephen Breyer", short: "Breyer", wing: "liberal" },
  { id: "SO", name: "Sandra Day O’Connor", short: "O’Connor", wing: "swing" },
  { id: "AK", name: "Anthony Kennedy", short: "Kennedy", wing: "swing" },
  { id: "WR", name: "William Rehnquist", short: "Rehnquist", wing: "conservative" },
  { id: "AS", name: "Antonin Scalia", short: "Scalia", wing: "conservative" },
  { id: "CT", name: "Clarence Thomas", short: "Thomas", wing: "conservative" },
];

export const LABELS = JUSTICES.map((j) => j.id);

/** Pair moments C_ij = <σ_i σ_j> digitized from Fig. 2 and symmetrized. Diagonal is 1. */
export const C = [
  [1.0, 0.58, 0.56, 0.52, 0.25, 0.23, 0.14, 0.08, 0.06],
  [0.58, 1.0, 0.71, 0.66, 0.39, 0.37, 0.3, 0.23, 0.2],
  [0.56, 0.71, 1.0, 0.63, 0.44, 0.4, 0.32, 0.26, 0.23],
  [0.52, 0.66, 0.63, 1.0, 0.49, 0.41, 0.34, 0.25, 0.21],
  [0.25, 0.39, 0.44, 0.49, 1.0, 0.64, 0.59, 0.52, 0.48],
  [0.23, 0.37, 0.4, 0.41, 0.64, 1.0, 0.7, 0.57, 0.53],
  [0.14, 0.3, 0.32, 0.34, 0.59, 0.7, 1.0, 0.69, 0.62],
  [0.08, 0.23, 0.26, 0.25, 0.52, 0.57, 0.69, 1.0, 0.78],
  [0.06, 0.2, 0.23, 0.21, 0.48, 0.53, 0.62, 0.78, 1.0],
];

/** Couplings J_ij from the inverse Ising problem on C, with h_i = 0 (symmetrized model). */
export const J = [
  [0.0, 0.365, 0.341, 0.271, -0.043, 0.066, -0.099, -0.08, -0.068],
  [0.365, 0.0, 0.562, 0.452, -0.049, 0.074, 0.067, 0.018, 0.015],
  [0.341, 0.562, 0.0, 0.271, 0.194, 0.115, -0.022, 0.045, 0.034],
  [0.271, 0.452, 0.271, 0.0, 0.395, 0.077, 0.093, -0.032, -0.117],
  [-0.043, -0.049, 0.194, 0.395, 0.0, 0.407, 0.217, 0.166, 0.141],
  [0.066, 0.074, 0.115, 0.077, 0.407, 0.0, 0.578, 0.091, 0.148],
  [-0.099, 0.067, -0.022, 0.093, 0.217, 0.578, 0.0, 0.515, 0.194],
  [-0.08, 0.018, 0.045, -0.032, 0.166, 0.091, 0.515, 0.0, 0.844],
  [-0.068, 0.015, 0.034, -0.117, 0.141, 0.148, 0.194, 0.844, 0.0],
];

export const MUTUAL_INFO = [0.14, 0.29, 0.33, 0.32, 0.55, 0.55, 0.4, 0.28, 0.28];
export const SUSCEPTIBILITY = [0.13, 0.25, 0.3, 0.28, 0.34, 0.35, 0.23, 0.2, 0.14];

export const IDEOLOGY_MEAN = {
  JS: -0.33,
  CT: 0.45,
};

export const MAJORITY_LABELS = ["5–4", "6–3", "7–2", "8–1", "9–0"];

/** Independent voters with ⟨σ_i⟩ = 0. Exact binomial on 512 states. */
export const MAJORITY_INDEPENDENT = [0.4922, 0.3281, 0.1406, 0.0352, 0.0039];

/** Pairwise MaxEnt on the reconstructed C. */
export const MAJORITY_PAIRWISE = [0.1954, 0.1492, 0.1508, 0.2006, 0.304];

/**
 * Empirical majority sizes quoted from the paper for the 2nd Rehnquist Court:
 * 5–4 ≈ 16 %, 9–0 ≈ 36–39 %. Intermediate bins are schematic to sum to 1.
 */
export const MAJORITY_EMPIRICAL = [0.16, 0.18, 0.16, 0.1, 0.4];

export const PROTOTYPES = [
  {
    id: "unanime",
    name: "Unánime 9–0",
    spins: [1, 1, 1, 1, 1, 1, 1, 1, 1],
    note: "Valle más profundo: todos votan igual.",
  },
  {
    id: "ideo",
    name: "Cisma ideológico 5–4",
    spins: [-1, -1, -1, -1, 1, 1, 1, 1, 1],
    note: "Liberales vs. conservadores (SO y AK con la mayoría conservadora).",
  },
  {
    id: "nucleo",
    name: "Núcleo conservador 7–2",
    spins: [1, 1, 1, 1, 1, 1, 1, -1, -1],
    note: "Scalia y Thomas disienten juntos.",
  },
];

export const SECTIONS = [
  { id: "portada", title: "Portada" },
  { id: "resumen", title: "Resumen e ideas más importantes" },
  { id: "datos", title: "La Corte y los datos" },
  { id: "fundamentos", title: "Fundamentos físicos" },
  { id: "maxent", title: "Entropía máxima e Ising" },
  { id: "correlaciones", title: "Correlaciones vs. acoplamientos" },
  { id: "unanimidad", title: "Unanimidad emergente" },
  { id: "paisaje", title: "Paisaje energético" },
  { id: "influencia", title: "Influencia de los jueces" },
  { id: "ideologia", title: "¿Hace falta la ideología?" },
  { id: "parcimonia", title: "Parcimonía del modelo" },
  { id: "conclusiones", title: "Conclusiones" },
  { id: "explorador", title: "Explorador de votos" },
];
