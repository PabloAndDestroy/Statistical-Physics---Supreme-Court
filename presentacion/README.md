# Presentación interactiva: mecánica estadística de la Corte Suprema

Interfaz en React (Vite) para exponer en español el paper de Lee, Broedersz y Bialek (2015). Incluye las ideas del artículo y un explorador de los 9 votos como spines de Ising.

## Cómo ejecutar

```powershell
cd presentacion
npm install
npm run dev
```

Abre la URL que imprima Vite (por defecto `http://localhost:5173`).

## Estilo (plantilla EAFIT)

La interfaz copia el lenguaje visual de `Plantilla_Fisica_EAFIT.pptx` (Escuela de Ciencias Aplicadas e Ingeniería):

- Fondo negro (`#0A0A0A` / `#121212`) y paneles `#151515`
- Acento oro `#C9A227` (kicker, recuadros en L, botones, cifras)
- Azul `#4A90E2` en órbitas y en los spines −1
- Elipses concéntricas, retícula vertical y línea oro punteada
- Logo Universidad EAFIT abajo a la derecha (`public/eafit-logo.png`)
- Tipografía Calibri / Calibri Light, esquinas rectas

## Contenido

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

## Datos

Las matrices C y J se reconstruyeron a partir de las Figs. 2 y 3 del paper y del problema inverso de Ising (hᵢ = 0). Reproducen la física del artículo (J de ambos signos, tres valles, unanimidad alta) con pequeñas diferencias numéricas respecto a los valores originales, que no están tabulados en el PDF. Las cifras de información mutua, susceptibilidad, 5–4 y 9–0 sí se toman del texto.
