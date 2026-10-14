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
          Nueve personas votan sí o no. Esta charla muestra, paso a paso, cómo un modelo
          de imanes (Ising) describe ese voto colectivo. No hace falta haber leído el paper.
        </p>
        <p className="authors">
          Basado en {PAPER.authors}, <em>{PAPER.title}</em> ({PAPER.year}). Corte: {PAPER.court}, {PAPER.period}, {PAPER.cases} casos.
        </p>
        <div className="grid-3">
          <div className="card">
            <h3>1. El dato</h3>
            <p>La Corte se pone de acuerdo más de lo que sugiere la polarización.</p>
          </div>
          <div className="card">
            <h3>2. La analogía</h3>
            <p>Cada juez es un spin +1 o −1, como un imán que solo apunta arriba o abajo.</p>
          </div>
          <div className="card">
            <h3>3. La prueba</h3>
            <p>Con solo correlaciones de pares se reconstruye cómo votan de verdad.</p>
          </div>
        </div>
      </>
    );
  }

  if (id === "enigma") {
    return (
      <>
        <div className="kicker">La pregunta</div>
        <h2>El enigma: polarización contra unanimidad</h2>
        <p>
          La imagen habitual de la Corte Suprema es un tribunal partido: cuatro liberales,
          cuatro conservadores y un juez bisagra. Uno esperaría muchos empates 5–4.
        </p>
        <p>
          Los datos dicen otra cosa. En más de 50 años, el resultado más frecuente es el
          <strong> 9–0</strong>: todos votan igual. En la Corte Rehnquist, el 9–0 ocurre
          ~36–39% de las veces y el 5–4 ~16%.
        </p>
        <div className="grid-2">
          <div className="card">
            <h3>Si votaran al azar, cada uno por su lado</h3>
            <p>Hay 512 formas de votar. Solo 2 son unánimes. Eso es el 0.4%.</p>
            <p>El 5–4 sería lo más común (~49%).</p>
          </div>
          <div className="card">
            <h3>Lo que se observa</h3>
            <p>El 9–0 es más de 80 veces más frecuente que el azar independiente.</p>
            <p>Y no son solo “casos fáciles”: muchos 9–0 empezaron con disenso en conferencia.</p>
          </div>
        </div>
        <p className="note">
          Pregunta de esta charla: ¿qué tipo de interacción entre jueces basta para producir
          ese consenso, sin meter a mano el contenido de cada caso?
        </p>
      </>
    );
  }

  if (id === "datos") {
    return (
      <>
        <div className="kicker">Los actores</div>
        <h2>Nueve jueces, un sí o un no</h2>
        <p>
          Cada caso llega como una pregunta binaria: ¿se afirma o se revoca la decisión
          anterior? Cada juez responde sí o no. El lado con cinco o más votos gana.
        </p>
        <p>
          El paper estudia periodos con la misma membresía (cortes naturales). El ejemplo
          grande es la segunda Corte Rehnquist: 1994–2005, 895 casos, siempre estos nueve.
        </p>
        <div className="grid-2">
          <div className="card">
            <h3>De izquierda a derecha, como se suelen ordenar</h3>
            {JUSTICES.map((j) => (
              <div key={j.id} style={{ display: "flex", gap: 8, margin: "6px 0", alignItems: "center" }}>
                <strong style={{ width: 28 }}>{j.id}</strong>
                <span>{j.name}</span>
                <span className={`tag ${j.wing}`}>
                  {j.wing === "liberal" ? "liberal" : j.wing === "swing" ? "bisagra" : "conservador"}
                </span>
              </div>
            ))}
          </div>
          <div className="card">
            <h3>El espacio de posibilidades</h3>
            <p>9 votos binarios → 2⁹ = 512 patrones posibles.</p>
            <p>Un patrón es, por ejemplo, “todos sí” o “los cuatro liberales en contra y los cinco restantes a favor”.</p>
            <p>Queremos una probabilidad P para cada uno de esos 512 patrones.</p>
            <p className="muted">Fuente: Supreme Court Database (Spaeth et al.).</p>
          </div>
        </div>
      </>
    );
  }

  if (id === "spines") {
    return (
      <>
        <div className="kicker">La analogía física</div>
        <h2>Cada voto es un spin de Ising</h2>
        <p>
          Un spin de Ising es la pieza más simple de un imán: solo puede apuntar “arriba”
          o “abajo”. El paper hace la misma apuesta con los jueces.
        </p>
        <div className="formula center">
          σᵢ = +1 &nbsp;o&nbsp; σᵢ = −1 &nbsp;para el juez i
        </div>
        <p>
          Por ahora el signo solo significa “este lado del caso” frente al otro. Más
          adelante se puede etiquetar +1 = conservador y −1 = liberal. El estado de la
          Corte es el vector (σ₁, …, σ₉).
        </p>
        <div className="grid-3">
          <div className="card">
            <h3>Imán</h3>
            <p>Átomos que se alinean o se oponen. El orden aparece aunque cada átomo sea simple.</p>
          </div>
          <div className="card">
            <h3>Corte</h3>
            <p>Jueces que coinciden o disienten. El 9–0 es el análogo de un imán imanado.</p>
          </div>
          <div className="card">
            <h3>Por qué sirve N = 9</h3>
            <p>No es un gas de 10²³ partículas, pero 512 estados se pueden listar todos. El modelo es exacto, sin simulaciones.</p>
          </div>
        </div>
        <p className="note">
          La analogía no es un dibujo: al final la probabilidad de cada patrón de votos
          será la misma fórmula que usa un imán de Ising.
        </p>
      </>
    );
  }

  if (id === "correlaciones-c") {
    const cij = C[pair.i][pair.j];
    const agree = ((1 + cij) / 2) * 100;
    const a = JUSTICES[pair.i];
    const b = JUSTICES[pair.j];
    return (
      <>
        <div className="kicker">Qué se mide primero</div>
        <h2>Correlación: ¿votan igual estos dos?</h2>
        <p>
          Aún no hablamos de “influencia”. Solo contamos, en los 895 casos, si el juez i
          y el juez j coinciden. Eso se resume en un número Cᵢⱼ entre −1 y +1:
        </p>
        <div className="formula center">
          Cᵢⱼ = ⟨σᵢ σⱼ⟩ &nbsp;→&nbsp; +1 siempre juntos, 0 independientes, −1 siempre opuestos
        </div>
        <p>
          Si C = 0.50, coinciden en el 75% de los casos, porque la fracción de acuerdo es
          (1 + C) / 2.
        </p>
        <div className="card">
          <h3>Mapa de C en la Corte Rehnquist (haz clic en un par)</h3>
          <Heatmap matrix={C} mode="C" selected={pair} onSelect={setPair} />
          <p>
            <strong>{a.short} y {b.short}:</strong> C = {cij.toFixed(2)}, coinciden cerca del {agree.toFixed(0)}% de las veces.
          </p>
        </div>
        <p className="note">
          Sorpresa: todas las C son positivas, incluso Stevens (el más liberal) y Thomas
          (el más conservador). Eso no quiere decir que se atraigan. En la siguiente
          sección construimos un modelo; después separaremos correlación de interacción.
        </p>
      </>
    );
  }

  if (id === "maxent") {
    return (
      <>
        <div className="kicker">Cómo se elige el modelo</div>
        <h2>El modelo más honesto: máxima entropía</h2>
        <p>
          Ya tenemos las 36 correlaciones de pares. Infinitas formas de asignar
          probabilidad a los 512 patrones coinciden con esas 36 cifras. ¿Cuál elegir?
        </p>
        <p>
          La respuesta de Shannon: quédate con la distribución que tenga más entropía,
          es decir, la que menos estructura extra inventa. Solo se permite lo que los
          datos ya mostraron (las Cᵢⱼ).
        </p>
        <div className="formula center">
          S[P] = − Σ P(σ) ln P(σ) &nbsp; máxima, con ⟨σᵢ σⱼ⟩ = Cᵢⱼ
        </div>
        <p>
          Esa receta produce, de forma automática, la distribución de Boltzmann de un
          modelo de Ising. Baja energía = patrón frecuente. Z solo normaliza para que
          las 512 probabilidades sumen 1.
        </p>
        <div className="formula center">
          {"P(σ) = e^{−E(σ)} / Z"}
        </div>
        <div className="grid-2">
          <div className="card">
            <h3>Qué entra</h3>
            <p>Las correlaciones medidas Cᵢⱼ. Nada sobre el texto de las sentencias.</p>
          </div>
          <div className="card">
            <h3>Qué sale</h3>
            <p>Una energía E para cada patrón y, con ella, una probabilidad para los 512 estados.</p>
          </div>
        </div>
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
        <div className="kicker">El resultado del modelo</div>
        <h2>Correlacionarse no es atraerse</h2>
        <p>
          Dos jueces pueden votar igual porque ambos siguen a un tercero. Cᵢⱼ mezcla todos
          esos caminos. El acoplamiento Jᵢⱼ es lo que queda cuando el resto de votos se
          fija: la interacción directa.
        </p>
        <p>
          En un imán, J &gt; 0 es ferromagnético (quieren alinearse) y J &lt; 0 es
          antiferromagnético (quieren oponerse). El paper encuentra ambos signos, aunque
          todas las C eran positivas.
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
            Ejemplo del paper: un voto de Thomas mueve a Stevens un factor eᴶ ≈ 1.1 (leve
            atracción directa). El de Scalia, ≈ 0.7 (repulsión). Scalia y Thomas tienen el
            J más grande. Las matrices de esta pantalla se reconstruyeron de las Figs. 2–3;
            la física es la misma, con pequeñas diferencias numéricas.
          </p>
        </div>
      </>
    );
  }

  if (id === "unanimidad") {
    return (
      <>
        <div className="kicker">Primera prueba del modelo</div>
        <h2>La unanimidad aparece sola</h2>
        <p>
          Nadie le dijo al modelo “prefiere el 9–0”. Solo se le pidió que respetara las
          correlaciones de pares. Aun así, predice que el unánime es mucho más común que
          el 5–4.
        </p>
        <p>
          Independientes: 9–0 ≈ 0.4%. Datos: 9–0 ≈ 36–39%, 5–4 ≈ 16%. El modelo de pares
          cae cerca de esas cifras (~10% de error en el paper).
        </p>
        <MajorityChart />
        <p>
          Eso se llama emergencia: un efecto de todo el grupo que no está escrito en ningún
          juez por separado. Es el mismo mecanismo por el que un imán se ordena aunque cada
          átomo sea débil.
        </p>
        <p className="note">
          Las barras “Datos” usan las cifras del paper para 5–4 y 9–0; las intermedias son
          esquemáticas. “Pares” es el modelo de esta interfaz.
        </p>
      </>
    );
  }

  if (id === "paisaje") {
    return (
      <>
        <div className="kicker">Cómo se organizan los 512 patrones</div>
        <h2>Casi todo cae en tres formas de votar</h2>
        <p>
          Imagina la energía como un terreno: los valles son patrones estables. Invertir
          cualquier juez sube la ladera. Como hay J positivos y negativos, hay varios
          valles, no uno solo.
        </p>
        <p>
          En la Corte Rehnquist, 508 de 512 estados viven en tres pares de valles (cada
          uno y su inverso, porque + y − son equivalentes si no etiquetamos ideología).
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
          En corto: la Corte no vaga por un mar desordenado. Oscila entre consenso total,
          cisma izquierda/derecha, y un núcleo Scalia–Thomas que a veces se despega.
        </p>
        <p className="note">La siguiente pantalla deja mover los nueve votos a mano.</p>
      </>
    );
  }

  if (id === "influencia") {
    const maxI = Math.max(...MUTUAL_INFO);
    const maxS = Math.max(...SUSCEPTIBILITY);
    return (
      <>
        <div className="kicker">Quién cuenta más</div>
        <h2>Los jueces del centro mueven la mayoría</h2>
        <p>
          Pregunta práctica: si te digo cómo votó un juez, ¿cuánto aprendes sobre quién
          ganó el caso? Eso es la información mutua I, en bits. 1 bit sería “con su voto
          ya sé el resultado”.
        </p>
        <p>
          Otra pregunta: si ese juez se inclina un poco (sin votar todavía), ¿cuánto se
          mueve la mayoría? Eso es la susceptibilidad. En este modelo las dos ideas van
          juntas.
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
          O’Connor y Kennedy: 0.55 bits (los más informativos). Stevens: 0.14 bits. Thomas
          predice parecido a Scalia (0.28 bits) pero mueve poco la mayoría: está en el
          extremo. Rehnquist predice bien y no es el más susceptible: el presidente de la
          Corte controla la agenda, no siempre el marcador.
        </p>
      </>
    );
  }

  if (id === "ideologia") {
    return (
      <>
        <div className="kicker">Etiquetas izquierda / derecha</div>
        <h2>La ideología se puede poner después</h2>
        <p>
          Hasta ahora ignoramos si un voto era “liberal” o “conservador”: solo importaba
          si coincidían. La base de Spaeth sí etiqueta cada voto. Entonces Stevens vota
          liberal en promedio ({IDEOLOGY_MEAN.JS}) y Thomas conservador ({IDEOLOGY_MEAN.CT}).
          El modelo añade un empujón hᵢ a cada juez, como un campo magnético.
        </p>
        <div className="grid-2">
          <div className="card">
            <h3>Lo que sí cambia</h3>
            <p>El 9–0 conservador pesa ~25% más que el 9–0 liberal.</p>
            <p>Hay un 5–4 con mayoría conservadora, y uno más raro al revés.</p>
            <p>El 7–2 contra Scalia y Thomas queda de un solo lado: ambos son conservadores estables.</p>
          </div>
          <div className="card">
            <h3>Lo que casi no cambia</h3>
            <p>Los J del modelo con ideología correlacionan 0.98 con los del modelo sin etiquetas.</p>
            <p>Scalia y Stevens no se oponen solo por sesgos: sigue habiendo J negativo entre ellos.</p>
            <p>Las etiquetas añaden poco una vez el grupo ya está ordenado.</p>
          </div>
        </div>
        <p className="note">
          Analogía: un campo terrestre débil no imanaría una brújula de átomos sueltos,
          pero sí orienta un imán que ya está ordenado. Los sesgos individuales son débiles;
          el orden es colectivo.
        </p>
      </>
    );
  }

  if (id === "parcimonia") {
    return (
      <>
        <div className="kicker">¿Más parámetros?</div>
        <h2>Los pares ya explican casi todo</h2>
        <p>
          Uno podría sospechar que hacen falta tríos o cuartetos de jueces (interacciones
          de tres y cuatro cuerpos), o los campos ideológicos. El paper los prueba y
          pregunta: ¿la mejora vale los parámetros extra?
        </p>
        <div className="grid-2">
          <div className="card">
            <h3>Añadir grupos de 4</h3>
            <p>Mejora poco (~0.2 bits por caso) y suma 126 parámetros. Con 895 casos, la penalización estadística es mayor que la ganancia.</p>
          </div>
          <div className="card">
            <h3>Añadir etiquetas ideológicas</h3>
            <p>Gana ~0.3 bits, pero hay que pagar el costo de etiquetar cada caso. La cuenta total queda casi igual.</p>
          </div>
        </div>
        <div className="card">
          <h3>Cuánto de lo colectivo capturan los pares</h3>
          <p>El 95% ± 3% de la información compartida entre los nueve jueces, en 18 cortes a lo largo de 50 años.</p>
          <p>La entropía de los votos es ~5 bits: de 512 patrones, la Corte usa de forma efectiva unos 32.</p>
        </div>
        <p className="note">
          En corto: el modelo chico no es una caricatura. Es la descripción más económica
          que sobrevive a una comparación honesta.
        </p>
      </>
    );
  }

  if (id === "conclusiones") {
    return (
      <>
        <div className="kicker">Cierre</div>
        <h2>Qué aprendimos, en orden</h2>
        <ul className="ideas">
          <li>La Corte se pone de acuerdo mucho más de lo que permitiría el voto independiente. Ese es el hecho que hay que explicar.</li>
          <li>Un sí/no se puede tratar como un spin. La probabilidad de cada patrón de 9 votos es la de un modelo de Ising.</li>
          <li>Todas las correlaciones crudas son positivas. Las interacciones directas J no: hay atracción y hay rechazo.</li>
          <li>Con solo pares aparece la unanimidad y tres valles (9–0, 5–4, núcleo Scalia–Thomas).</li>
          <li>Quien más informa el resultado es el juez del centro, no el extremo ideológico.</li>
          <li>Etiquetar liberal/conservador o añadir interacciones de muchos cuerpos no paga: los pares ya capturan ~95% de la estructura colectiva.</li>
        </ul>
        <p className="lead">
          Un grupo político de nueve personas admite una teoría cuantitativa de mecánica
          estadística. La analogía con el imán, en este caso, es una ecuación.
        </p>
      </>
    );
  }

  return (
    <>
      <div className="kicker">Laboratorio</div>
      <h2>Mueve los nueve votos</h2>
      <p>
        Cada clic invierte un juez. La energía E usa los J del modelo. Recuerda:
        {" P = e^{−E}/Z"}, así que menor E = patrón más probable. ΔE es lo que sube o
        baja la energía si solo cambia ese juez.
      </p>
      <VoteExplorer />
      <div className="card">
        <h3>Una ruta de 4 clics</h3>
        <p>1. Deja el 9–0: todos los ΔE son positivos. Estás en el valle más profundo.</p>
        <p>2. Carga el 5–4 ideológico: otro valle, con E menos negativa (menos probable que el unánime).</p>
        <p>3. Carga el 7–2 de Scalia y Thomas: el tercer prototipo.</p>
        <p>4. Pulsa Azar: casi siempre hay un juez cuyo ΔE es negativo. Ese flip te acerca a un valle.</p>
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
