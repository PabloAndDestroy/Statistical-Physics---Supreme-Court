# Supreme Court Pairwise MaxEnt Model

This project fits a pairwise maximum-entropy (Ising) model to nine-justice voting data. The C++ program enumerates every one of the $2^9=512$ possible vote configurations, computes exact model probabilities, and adjusts the local fields $h_i$ and pair couplings $J_{ij}$ to match the observed vote means and pair moments.

The model uses

$
E(\boldsymbol{\sigma})=-\sum_i h_i\sigma_i-\sum_{i<j}J_{ij}\sigma_i\sigma_j,
\qquad
P(\boldsymbol{\sigma})=\frac{e^{-E(\boldsymbol{\sigma})}}{Z}.
$

The Python script runs the C++ executable and creates plots of the input pair-moment matrix, fitted coupling matrix, the relationship between pair moments and couplings, and majority-split probabilities.

## Presentación interactiva

Interfaz en React (Vite) para exponer en español el paper de Lee, Broedersz y Bialek (2015). Incluye las ideas del artículo y un explorador de los 9 votos como spines de Ising.

```powershell
cd presentacion
npm install
npm run dev
```

Abre la URL que imprima Vite (por defecto `http://localhost:5173`).

### Estilo (plantilla EAFIT)

La interfaz copia el lenguaje visual de `Plantilla_Fisica_EAFIT.pptx` (Escuela de Ciencias Aplicadas e Ingeniería):

- Fondo negro (`#0A0A0A` / `#121212`) y paneles `#151515`
- Acento oro `#C9A227` (kicker, recuadros en L, botones, cifras)
- Azul `#4A90E2` en órbitas y en los spines −1
- Elipses concéntricas, retícula vertical y línea oro punteada
- Logo Universidad EAFIT abajo a la derecha (`presentacion/public/eafit-logo.png`)
- Tipografía Calibri / Calibri Light, esquinas rectas

### Contenido

1. Portada
2. Resumen e ideas más importantes
3. La Corte y los datos
4. Fundamentos físicos
5. Entropía máxima e Ising
6. Correlaciones vs. acoplamientos (mapas C y J clicables)
7. Unanimidad emergente
8. Paisaje energético
9. Influencia de los jueces
10. Ideología
11. Parcimonía del modelo
12. Conclusiones
13. Explorador de votos (invierte spines, ve energía y valle)

Navega con la barra lateral, Anterior/Siguiente o las flechas del teclado.

En el explorador se pueden cargar los tres valles del paper (9–0, 5–4 ideológico, 7–2 Scalia–Thomas), invertir un juez y ver energía, probabilidad relativa y si el patrón es un mínimo local.

### Datos de la presentación

Las matrices C y J se reconstruyeron a partir de las Figs. 2 y 3 del paper y del problema inverso de Ising ($h_i = 0$). Reproducen la física del artículo (J de ambos signos, tres valles, unanimidad alta) con pequeñas diferencias numéricas respecto a los valores originales, que no están tabulados en el PDF. Las cifras de información mutua, susceptibilidad, 5–4 y 9–0 sí se toman del texto.

## Requirements

- A C++20 compiler such as `g++`.
- Python 3.10 or newer.
- Python packages `numpy` and `matplotlib`:

```powershell
python -m pip install numpy matplotlib
```

## Build And Run

From the project directory, compile the C++ program:

```powershell
g++ -std=c++20 -Wall -Wextra -Wpedantic main.cpp -o supreme_court.exe
```

Run the illustrative demonstration and generate the plot:

```powershell
python plot_results.py --executable .\supreme_court.exe
```

The figure is saved as `supreme_court_analysis.png` by default. Add `--show` to also open it in a plot window, or use `--output plots\analysis.png` to choose a different path.

## Use Vote Data

Pass a headerless CSV file with one case per row and exactly nine comma-separated spins per row. The column order is:

```text
JS, RG, DS, SB, SO, AK, WR, AS, CT
```

Use `+1` for a conservative vote and `-1` for a liberal vote. For example:

```csv
1,1,-1,1,1,-1,1,1,1
-1,-1,-1,1,1,1,-1,-1,-1
```

Run the fit and plot against that dataset:

```powershell
python plot_results.py votes.csv --executable .\supreme_court.exe --show
```

In data mode, the C++ program computes each justice's mean vote and the raw pair moments $C_{ij}=\langle\sigma_i\sigma_j\rangle$ from the CSV. The Python script uses the same records to plot the empirical majority-size distribution alongside the independent-voter and pairwise-model predictions.

## Outputs

The C++ executable prints the fitted coupling matrix and majority-size probabilities for 5-4 through 9-0 outcomes. The Python figure contains:

- A heatmap of the input pair moments $C_{ij}$.
- A heatmap of the fitted couplings $J_{ij}$.
- A scatter plot comparing each pair's $C_{ij}$ and $J_{ij}$.
- A grouped comparison of independent, pairwise-model, and, when a CSV is supplied, observed majority frequencies.

Raw correlation and coupling are different quantities: $C_{ij}$ includes indirect association through the rest of the Court, while $J_{ij}$ is the model's inferred direct pair interaction. The scatter plot is descriptive and should not be interpreted as causal evidence.

## Data Caveat

No case-level Supreme Court voting records are included. Running without a CSV uses an illustrative, symmetric correlation matrix for demonstration; it is not the empirical 2nd Rehnquist Court matrix from the paper. To reproduce an empirical analysis, provide the relevant vote records as described above. The paper's approximate 5-4 and unanimous frequencies printed in demo mode are context only, not values computed from the illustrative matrix.