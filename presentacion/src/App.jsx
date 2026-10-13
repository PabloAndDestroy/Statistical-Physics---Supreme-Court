import { useEffect, useMemo, useState } from "react";
import {
  C,
  IDEOLOGY_MEAN,
  J,
  JUSTICES,
  MAJORITY_EMPIRICAL,
  MAJORITY_INDEPENDENT,
  MAJORITY_LABELS,
  MAJORITY_PAIRWISE,
  MUTUAL_INFO,
  PAPER,
  PROTOTYPES,
  SECTIONS,
  SUSCEPTIBILITY,
} from "./data.js";
import {
  energy,
  flipDeltas,
  isLocalMinimum,
  majoritySplit,
  patternString,
  probability,
  relativeToUnanimous,
  valleyName,
} from "./ising.js";

function mix(a, b, t) {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t));
}

function rgb(c) {
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function colorC(value) {
  const t = Math.max(0, Math.min(1, value));
  return rgb(mix([26, 26, 26], [201, 162, 39], t));
}

function colorJ(value) {
  const t = Math.max(-1, Math.min(1, value));
  if (t >= 0) return rgb(mix([30, 30, 30], [201, 162, 39], t));
  return rgb(mix([30, 30, 30], [74, 144, 226], -t));
}

function Heatmap({ matrix, mode, selected, onSelect }) {
  return (
    <div>
      <table className="heatmap">
        <thead>
          <tr>
            <th />
            {JUSTICES.map((j) => (
              <th key={j.id}>{j.id}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {JUSTICES.map((row, i) => (
            <tr key={row.id}>
              <th>{row.id}</th>
              {JUSTICES.map((col, j) => {
                const value = matrix[i][j];
                const isSel = selected?.i === i && selected?.j === j;
                const bg = i === j ? "#1a1a1a" : mode === "C" ? colorC(value) : colorJ(value);
                const fg = value > 0.45 || value < -0.25 ? "#0a0a0a" : "#ddd";
                return (
                  <td
                    key={col.id}
                    className={isSel ? "selected" : ""}
                    style={{ background: bg, color: fg }}
                    onClick={() => i !== j && onSelect({ i, j })}
                    title={`${row.id}–${col.id}: ${value.toFixed(2)}`}
                  >
                    {i === j ? "—" : value.toFixed(2)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="legend">
        <span>{mode === "C" ? "0" : "−"}</span>
        <div
          className="bar"
          style={{
            background:
              mode === "C"
                ? "linear-gradient(90deg,#fff,#111)"
                : "linear-gradient(90deg,#5aa0d2,#fff,#c24b3a)",
          }}
        />
        <span>{mode === "C" ? "1" : "+"}</span>
      </div>
    </div>
  );
}

function MajorityChart() {
  const series = [
    { name: "Independiente P⁽¹⁾", values: MAJORITY_INDEPENDENT, color: "#555555" },
    { name: "Pares P⁽²⁾", values: MAJORITY_PAIRWISE, color: "#c9a227" },
    { name: "Datos (paper)", values: MAJORITY_EMPIRICAL, color: "#4a90e2" },
  ];
  return (
    <div className="grid-3">
      {series.map((s) => (
        <div className="card" key={s.name}>
          <h3>{s.name}</h3>
          <div className="bars">
            {MAJORITY_LABELS.map((label, i) => (
              <div className="bar-row" key={label}>
                <span>{label}</span>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${s.values[i] * 100}%`, background: s.color }}
                  />
                </div>
                <span>
                  {s.values[i] < 0.01
                    ? `${(s.values[i] * 100).toFixed(1)}%`
                    : `${Math.round(s.values[i] * 100)}%`}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function VoteExplorer({ compact = false }) {
  const [spins, setSpins] = useState(PROTOTYPES[0].spins.slice());
  const e = energy(spins);
  const p = probability(spins);
  const rel = relativeToUnanimous(spins);
  const deltas = flipDeltas(spins);
  const localMin = isLocalMinimum(spins);

  function flip(i) {
    setSpins((prev) => {
      const next = prev.slice();
      next[i] *= -1;
      return next;
    });
  }

  return (
    <div>
      <div className="toolbar">
        {PROTOTYPES.map((proto) => (
          <button key={proto.id} onClick={() => setSpins(proto.spins.slice())}>
            {proto.name}
          </button>
        ))}
        <button
          className="ghost"
          onClick={() =>
            setSpins(Array.from({ length: 9 }, () => (Math.random() < 0.5 ? 1 : -1)))
          }
        >
          Azar
        </button>
      </div>

      <div className="justice-row">
        {JUSTICES.map((j, i) => (
          <button
            type="button"
            className={`justice ${spins[i] === 1 ? "plus" : "minus"}`}
            key={j.id}
            onClick={() => flip(i)}
          >
            <div className="avatar">{j.id}</div>
            <div className="name">{j.short}</div>
            <span className={`tag ${j.wing}`}>
              {spins[i] === 1 ? "+1" : "−1"}
            </span>
            <div className="delta">ΔE {deltas[i] >= 0 ? "+" : ""}{deltas[i].toFixed(2)}</div>
          </button>
        ))}
      </div>

      <div className="metrics">
        <div className="card">
          <div className="muted">Configuración</div>
          <div className="stat" style={{ fontSize: 22 }}>{patternString(spins)}</div>
        </div>
        <div className="card">
          <div className="muted">Energía E(σ)</div>
          <div className="stat">{e.toFixed(2)}</div>
        </div>
        <div className="card">
          <div className="muted">P(σ) / P(unánime)</div>
          <div className="stat">{rel.toFixed(2)}</div>
        </div>
        <div className="card">
          <div className="muted">Mayoría</div>
          <div className="stat">{majoritySplit(spins)}</div>
        </div>
      </div>

      <p>
        <strong>{valleyName(spins)}</strong>
        {localMin ? " · mínimo local: cualquier voto que se invierta sube la energía." : " · no es un mínimo: hay un juez cuyo cambio baja E."}
        {" "}
        Probabilidad del modelo: {(p * 100).toFixed(2)}%.
      </p>
      {!compact && (
        <p className="note">
          Haz clic en un juez para invertir su voto. ΔE es el cambio de energía de ese único
          flip. En un valle, todos los ΔE son positivos.
        </p>
      )}
    </div>
  );
}

function Section({ id }) {
  const [pair, setPair] = useState({ i: 7, j: 8 });

  if (id === "portada") {
    return (
      <>
        <div className="kicker">EAFIT · Física estadística</div>
        <h1>Mecánica estadística de la Corte Suprema de Estados Unidos</h1>
        <p className="lead">
          Cómo un modelo de Ising de entropía máxima, construido solo con correlaciones de
          pares, describe el voto colectivo de nueve jueces.
        </p>
        <p className="authors">
          Paper: {PAPER.authors}, <em>{PAPER.title}</em>, {PAPER.journal} ({PAPER.year}).
          Corte analizada: {PAPER.court}, {PAPER.period}, {PAPER.cases} casos.
        </p>
        <div className="grid-3">
          <div className="card"><div className="stat">9</div><div className="muted">jueces = spines de Ising</div></div>
          <div className="card"><div className="stat">512</div><div className="muted">configuraciones (2^9)</div></div>
          <div className="card"><div className="stat">36%</div><div className="muted">unanimidad media en 18 cortes</div></div>
        </div>
      </>
    );
  }

  if (id === "resumen") {
    return (
      <>
        <div className="kicker">Resumen</div>
        <h2>Ideas más importantes del paper</h2>
        <ul className="ideas">
          <li>
            Cada voto se representa como un spin σᵢ = +1 o −1. El estado de la Corte es un
            vector de 9 spines: hay 512 patrones posibles.
          </li>
          <li>
            Todas las correlaciones crudas Cᵢⱼ = ⟨σᵢσⱼ⟩ son positivas. Eso no significa que
            todos los jueces se atraigan: las interacciones directas Jᵢⱼ tienen ambos signos.
          </li>
          <li>
            El modelo de entropía máxima de pares es un vidrio de spin de Ising. Reproduce
            la distribución de votos, la unanimidad y la información mutua juez–mayoría.
          </li>
          <li>
            La unanimidad (~36–39%) es un fenómeno colectivo. Si votaran independientes,
            ocurriría ~1% de las veces.
          </li>
          <li>
            Más del 99% de los 512 estados caen en tres pares de valles: unanimidad, cisma
            5–4 ideológico, y disenso 7–2 de Scalia y Thomas.
          </li>
          <li>
            Los jueces medianos (O’Connor y Kennedy) tienen la mayor influencia sobre la
            mayoría. Los extremos ideológicos tienen la menor.
          </li>
          <li>
            El modelo de pares captura 95% ± 3% de la multi-información en 18 cortes
            naturales. Añadir ideología o correlaciones de orden superior no vale la
            complejidad extra.
          </li>
        </ul>
      </>
    );
  }

  if (id === "datos") {
    return (
      <>
        <div className="kicker">Datos</div>
        <h2>La Corte Suprema y los votos</h2>
        <p>
          Una <strong>corte natural</strong> es un periodo con los mismos nueve jueces. El
          paper se concentra en la segunda Corte Rehnquist (1994–2005, 895 votos), el
          conjunto más grande, y comprueba el modelo en 18 cortes a lo largo de 50 años.
        </p>
        <p>
          Cada juez emite sí o no. La definición de sí/no depende del tribunal inferior, así
          que el paper primero simetriza: {`{σ}`} y {`{−σ}`} son igualmente probables y
          ⟨σᵢ⟩ = 0. Después estudia votos etiquetados como conservador/liberal.
        </p>
        <div className="grid-2">
          <div className="card">
            <h3>Orden ideológico (izquierda → derecha)</h3>
            {JUSTICES.map((j) => (
              <div key={j.id} style={{ display: "flex", gap: 8, margin: "6px 0", alignItems: "center" }}>
                <strong style={{ width: 28 }}>{j.id}</strong>
                <span>{j.name}</span>
                <span className={`tag ${j.wing}`}>{j.wing}</span>
              </div>
            ))}
          </div>
          <div className="card">
            <h3>Hechos que el modelo debe explicar</h3>
            <p>La unanimidad es más frecuente que los 5–4 durante más de 50 años.</p>
            <p>Las correlaciones entre todos los pares son positivas, incluso entre Stevens y Thomas.</p>
            <p>La unanimidad no parece un conjunto de casos “fáciles”: muchos 9–0 empezaron con disensos en conferencia.</p>
            <p className="muted">Fuente de votos: Supreme Court Database, Spaeth et al.</p>
          </div>
        </div>
      </>
    );
  }

  if (id === "fundamentos") {
    return (
      <>
        <div className="kicker">Fundamentos físicos</div>
        <h2>De la Corte a un imán de Ising</h2>
        <p>
          La analogía no es metafórica: el paper escribe una probabilidad de Boltzmann para
          los votos y esa probabilidad es exactamente el modelo de Ising.
        </p>
        <div className="formula center">
          σᵢ = +1  (voto A) &nbsp;·&nbsp; σᵢ = −1  (voto B)
        </div>
        <div className="grid-2">
          <div className="card">
            <h3>Spines</h3>
            <p>
              Cada juez es un momento magnético que solo puede apuntar “arriba” o “abajo”.
              N = 9 no es el límite termodinámico, pero 512 estados se enumeran exactos: no
              hace falta Monte Carlo.
            </p>
          </div>
          <div className="card">
            <h3>Acoplamientos</h3>
            <p>
              Jᵢⱼ &gt; 0 favorece que i y j voten igual (ferromagnético). Jᵢⱼ &lt; 0 favorece el
              voto opuesto (antiferromagnético). El campo hᵢ, cuando existe, empuja a un juez
              hacia conservador o liberal.
            </p>
          </div>
          <div className="card">
            <h3>Energía</h3>
            <p>
              Los patrones frecuentes son los de baja energía. Competencia entre J de ambos
              signos produce varios mínimos: un paisaje de vidrio de spin.
            </p>
          </div>
          <div className="card">
            <h3>Consenso como imanación</h3>
            <p>
              Cuando el sistema se ordena (unanimidad o bloque), un sesgo ideológico débil
              basta para alinear el bloque con el caso, igual que un campo terrestre débil
              orienta una brújula ya imanada.
            </p>
          </div>
        </div>
      </>
    );
  }

  if (id === "maxent") {
    return (
      <>
        <div className="kicker">Principio de máxima entropía</div>
        <h2>La distribución menos estructurada que respeta los datos</h2>
        <p>
          Hay infinitas P(σ) compatibles con las correlaciones medidas. Shannon demostró
          que la única medida consistente de “aleatoriedad” es la entropía.
        </p>
        <div className="formula center">
          S[P] = − Σ P(σ) ln P(σ)
        </div>
        <p>
          Se maximiza S con la restricción de reproducir Cᵢⱼ = ⟨σᵢσⱼ⟩ (y, si hay ideología,
          también ⟨σᵢ⟩). Los multiplicadores de Lagrange son los Jᵢⱼ y los hᵢ. El resultado
          es la distribución de Boltzmann:
        </p>
        <div className="formula center">
          {"P(σ) = e^{−E(σ)} / Z,  E(σ) = −Σᵢ hᵢ σᵢ − ½ Σᵢ≠ⱼ Jᵢⱼ σᵢ σⱼ"}
        </div>
        <p>
          No hay parámetros libres extra: una vez fijados los momentos empíricos, P queda
          determinada. El modelo simetrizado del paper usa hᵢ = 0.
        </p>
        <p className="note">
          Z se calcula sumando las 512 configuraciones. Esta interfaz usa esa suma exacta.
        </p>
      </>
    );
  }

  if (id === "correlaciones") {
    const cij = C[pair.i][pair.j];
    const jij = J[pair.i][pair.j];
    const a = JUSTICES[pair.i];
    const b = JUSTICES[pair.j];
    return (
      <>
        <div className="kicker">Cᵢⱼ frente a Jᵢⱼ</div>
        <h2>Correlación no es interacción directa</h2>
        <p>
          Cᵢⱼ mezcla caminos indirectos (A influye a B a través de C). Jᵢⱼ es la interacción
          residual cuando el resto de votos se mantiene fijo. Por eso C es todo positivo y
          J tiene signos mixtos.
        </p>
        <div className="grid-2">
          <div className="card">
            <h3>Momentos de par Cᵢⱼ = ⟨σᵢσⱼ⟩</h3>
            <Heatmap matrix={C} mode="C" selected={pair} onSelect={setPair} />
          </div>
          <div className="card">
            <h3>Acoplamientos Jᵢⱼ</h3>
            <Heatmap matrix={J} mode="J" selected={pair} onSelect={setPair} />
          </div>
        </div>
        <div className="card">
          <h3>
            Par seleccionado: {a.short}–{b.short}
          </h3>
          <p>
            C = {cij.toFixed(2)} · J = {jij.toFixed(3)} · factor eᴶ ≈ {Math.exp(jij).toFixed(2)}.
            {jij < 0
              ? " Interacción directa negativa: si el resto se fija, tienden a votar en contra."
              : " Interacción directa positiva: tienden a votar juntos."}
          </p>
          <p className="muted">
            En el paper, e^{J} de Thomas sobre Stevens es ~1.1 (leve atracción directa) y la
            de Scalia sobre Stevens es ~0.7 (repulsión). El núcleo Scalia–Thomas tiene el J
            más grande. Las matrices de esta interfaz se reconstruyeron de las Figs. 2 y 3 y
            del problema inverso de Ising; ilustran la misma física con pequeñas diferencias
            numéricas.
          </p>
        </div>
      </>
    );
  }

  if (id === "unanimidad") {
    return (
      <>
        <div className="kicker">Emergencia</div>
        <h2>La unanimidad sale de los pares</h2>
        <p>
          Si cada juez votara independiente con ⟨σᵢ⟩ = 0, el 9–0 tendría probabilidad 2/512 ≈
          0.4%. En los datos, el 9–0 es ~36–39%, más del doble que el 5–4 (~16%).
        </p>
        <MajorityChart />
        <p>
          El modelo de pares P⁽²⁾ ya produce una masa grande en 9–0. El paper reporta que
          predice las frecuencias de mayoría con ~10% de error y que la unanimidad es el
          doble de probable que un 5–4. Eso es un efecto colectivo: no se pone a mano un
          término de nueve cuerpos.
        </p>
        <p className="note">
          Las barras “Datos” usan las cifras del paper para 5–4 y 9–0; las intermedias son
          esquemáticas. P⁽²⁾ es el modelo de esta interfaz.
        </p>
      </>
    );
  }

  if (id === "paisaje") {
    return (
      <>
        <div className="kicker">Paisaje energético</div>
        <h2>Tres valles organizan casi todos los votos</h2>
        <p>
          J de ambos signos frustra el sistema. Aparecen varios mínimos locales: invertir
          cualquier juez sube E. En la Corte Rehnquist, 508 de 512 estados caen en 2×3
          valles.
        </p>
        <div className="grid-3">
          {PROTOTYPES.map((p) => (
            <div className="card" key={p.id}>
              <h3>{p.name}</h3>
              <div className="stat" style={{ fontSize: 22 }}>{patternString(p.spins)}</div>
              <p className="muted">{p.note}</p>
            </div>
          ))}
        </div>
        <p>
          El paper proyecta los votos sobre dos parámetros de orden: solapamiento con el
          unánime m⁽¹⁾ y con el 5–4 ideológico m⁽²⁾. La probabilidad se concentra en el
          borde de ese cuadrado: la Corte vive en la competencia entre consenso e ideología,
          no en un centro desordenado.
        </p>
        <VoteExplorer compact />
      </>
    );
  }

  if (id === "influencia") {
    const maxI = Math.max(...MUTUAL_INFO);
    const maxS = Math.max(...SUSCEPTIBILITY);
    return (
      <>
        <div className="kicker">Influencia</div>
        <h2>Quién mueve a la mayoría</h2>
        <p>
          I(σᵢ; γ) es la información mutua entre el voto del juez y la decisión de la Corte.
          La susceptibilidad χ mide cómo cambia ⟨γ⟩ si ese juez “se inclina” un poco sin
          votar. En el modelo de equilibrio, ambas ideas coinciden con la correlación
          juez–mayoría.
        </p>
        <div className="grid-2">
          <div className="card">
            <h3>Información mutua I(σᵢ; γ) [bits]</h3>
            <div className="bars">
              {JUSTICES.map((j, i) => (
                <div className="bar-row" key={j.id}>
                  <span>{j.id}</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${(MUTUAL_INFO[i] / maxI) * 100}%`,
                        background: j.wing === "liberal" ? "#4a90e2" : j.wing === "swing" ? "#cfcfcf" : "#c9a227",
                      }}
                    />
                  </div>
                  <span>{MUTUAL_INFO[i].toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <h3>Susceptibilidad de la mayoría</h3>
            <div className="bars">
              {JUSTICES.map((j, i) => (
                <div className="bar-row" key={j.id}>
                  <span>{j.id}</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${(SUSCEPTIBILITY[i] / maxS) * 100}%`,
                        background: "#c9a227",
                      }}
                    />
                  </div>
                  <span>{SUSCEPTIBILITY[i].toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <p>
          O’Connor y Kennedy: 0.55 bits. Stevens: 0.14 bits. Thomas tiene I similar a Scalia
          (0.28) pero susceptibilidad tan baja como Stevens. Rehnquist predice bien la
          mayoría (tercero en I) y solo es mediano en susceptibilidad: el Chief Justice
          controla agenda y ponencias, no necesariamente el resultado.
        </p>
      </>
    );
  }

  if (id === "ideologia") {
    return (
      <>
        <div className="kicker">Modelo con etiquetas</div>
        <h2>La ideología emerge de los pares</h2>
        <p>
          Spaeth et al. etiquetan cada voto como liberal (σ = −1) o conservador (σ = +1).
          Entonces ⟨σᵢ⟩ ya no es cero: Stevens ≈ {IDEOLOGY_MEAN.JS}, Thomas ≈ {IDEOLOGY_MEAN.CT}.
          El modelo añade campos hᵢ.
        </p>
        <div className="grid-2">
          <div className="card">
            <h3>Lo que cambia</h3>
            <p>El valle unánime conservador pesa ~25% más que el liberal.</p>
            <p>Sigue existiendo un 5–4 con mayoría conservadora, y uno menor al revés.</p>
            <p>El 7–2 contra Scalia y Thomas queda de un solo lado: ambos son conservadores muy estables.</p>
          </div>
          <div className="card">
            <h3>Lo que no cambia</h3>
            <p>Los Jᵢⱼ del modelo ideológico correlacionan 0.98 con los del modelo simetrizado.</p>
            <p>Scalia y Stevens no votan en contra solo por sesgos opuestos: hay interacción directa negativa.</p>
            <p>El modelo con campos captura 92% ± 3% de la multi-información.</p>
          </div>
        </div>
        <p>
          Una vez la Corte se polariza de forma colectiva, un sesgo débil alinea ese bloque
          con el contenido izquierda/derecha del caso. Por eso las etiquetas ideológicas
          añaden poco poder predictivo.
        </p>
      </>
    );
  }

  if (id === "parcimonia") {
    return (
      <>
        <div className="kicker">Selección de modelo</div>
        <h2>El modelo de pares es el más parsimonioso</h2>
        <p>
          Añadir correlaciones de orden 4 mejora la verosimilitud ~0.2 bits por caso, pero
          suma 126 parámetros. Con K = 895, la penalización bayesiana (~ (ℓ/2) log₂ K) es
          ~0.69 bits: el extra no se justifica.
        </p>
        <p>
          El modelo ideológico gana ~0.3 bits por caso con 9 campos, pero hay que pagar la
          información de etiquetar cada caso (divergencia de Kullback–Leibler ≈ 0.3 bits).
          La longitud de descripción total queda casi igual a la del modelo simetrizado.
        </p>
        <div className="card">
          <h3>Fracción de multi-información capturada</h3>
          <p>F = (S₁ − S₂) / I₉ = 0.95 ± 0.03 en las 18 cortes naturales (datos simetrizados).</p>
          <p>Cota conservadora con la cota de Ma: F ≥ 0.83 ± 0.03.</p>
          <p>La entropía de los votos es S ≈ 5 bits: de 512 patrones, la Corte usa ~32 de forma efectiva.</p>
        </div>
      </>
    );
  }

  if (id === "conclusiones") {
    return (
      <>
        <div className="kicker">Cierre</div>
        <h2>Qué se lleva uno del paper</h2>
        <ul className="ideas">
          <li>Un grupo político pequeño admite una teoría cuantitativa de mecánica estadística, no solo una analogía.</li>
          <li>Las correlaciones positivas esconden interacciones de ambos signos. El problema inverso de Ising las separa.</li>
          <li>Consenso y polarización son orden colectivo. Los sesgos individuales son demasiado débiles para producirlos solos.</li>
          <li>Tres prototipos —unanimidad, 5–4 ideológico, núcleo Scalia–Thomas— organizan el espacio de votos.</li>
          <li>La influencia se concentra en los jueces medianos, como dice la ciencia política, y el modelo lo mide en bits y en susceptibilidad.</li>
        </ul>
        <p className="lead">Siguiente: el explorador, para mover los nueve spines y ver energía, probabilidad y valle.</p>
      </>
    );
  }

  return (
    <>
      <div className="kicker">Laboratorio</div>
      <h2>Explorador de votos de la Corte Rehnquist</h2>
      <p>
        Cada clic invierte un spin. La energía usa los J reconstruidos del paper. Baja
        energía = alta probabilidad según {"P = e^{−E}/Z"}.
      </p>
      <VoteExplorer />
      <div className="card">
        <h3>Cómo leerlo en clase</h3>
        <p>1. Parte del 9–0 y mira que todos los ΔE son positivos: es un mínimo.</p>
        <p>2. Carga el 5–4 ideológico: también es mínimo, con energía más alta.</p>
        <p>3. Carga el 7–2 de Scalia y Thomas: el tercer valle.</p>
        <p>4. Un patrón aleatorio suele tener E mayor y al menos un flip que baja la energía: cae hacia un prototipo.</p>
      </div>
    </>
  );
}

export default function App() {
  const [index, setIndex] = useState(0);
  const section = SECTIONS[index];

  useEffect(() => {
    function onKey(event) {
      if (event.key === "ArrowRight" || event.key === "PageDown") {
        setIndex((i) => Math.min(SECTIONS.length - 1, i + 1));
      } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
        setIndex((i) => Math.max(0, i - 1));
      } else if (event.key === "Home") setIndex(0);
      else if (event.key === "End") setIndex(SECTIONS.length - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const progress = useMemo(() => ((index + 1) / SECTIONS.length) * 100, [index]);

  return (
    <div className="shell">
      <div className="orbits" aria-hidden="true">
        <span className="orbit o1" />
        <span className="orbit o2" />
        <span className="orbit o3" />
      </div>
      <div className="gold-dash" aria-hidden="true" />
      <aside className="sidebar">
        <div className="brand">
          <small>Universidad EAFIT</small>
          <strong>Corte Suprema como sistema de Ising</strong>
        </div>
        <nav className="nav">
          {SECTIONS.map((s, i) => (
            <button
              key={s.id}
              className={i === index ? "active" : ""}
              onClick={() => setIndex(i)}
            >
              <span className="idx">{String(i + 1).padStart(2, "0")}</span>
              {s.title}
            </button>
          ))}
        </nav>
        <div className="hint">Flechas del teclado para avanzar. {Math.round(progress)}%.</div>
      </aside>
      <main className="main">
        <article className="slide">
          <Section id={section.id} />
          <div className="pager">
            <button
              className="ghost"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
            >
              Anterior
            </button>
            <button
              onClick={() => setIndex((i) => Math.min(SECTIONS.length - 1, i + 1))}
              disabled={index === SECTIONS.length - 1}
            >
              Siguiente
            </button>
          </div>
        </article>
        <img className="eafit-logo" src="/eafit-logo.png" alt="" />
      </main>
    </div>
  );
}
