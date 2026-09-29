"""Run the Supreme Court C++ model and plot its fit and vote statistics."""

from __future__ import annotations

import argparse
import csv
import shutil
import subprocess
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np


ROOT = Path(__file__).resolve().parent
JUSTICES = ["JS", "RG", "DS", "SB", "SO", "AK", "WR", "AS", "CT"]
SPLITS = ["5-4", "6-3", "7-2", "8-1", "9-0"]


def resolve_executable(requested: str | None) -> Path:
    if requested:
        executable = Path(requested).expanduser().resolve()
        if executable.is_file():
            return executable
        raise FileNotFoundError(f"C++ executable not found: {executable}")

    candidates = [
        ROOT / "build" / "Debug" / "outDebug.exe",
        ROOT / "build" / "Debug" / "outDebug",
        ROOT / "supreme_court.exe",
        ROOT / "supreme_court",
    ]
    for candidate in candidates:
        if candidate.is_file():
            return candidate

    compiler = shutil.which("g++")
    if compiler is None:
        raise FileNotFoundError(
            "No C++ executable found and g++ is unavailable. Build main.cpp first "
            "or pass --executable."
        )

    executable = ROOT / ("supreme_court.exe" if shutil.which("cmd") else "supreme_court")
    subprocess.run(
        [compiler, "-std=c++20", str(ROOT / "main.cpp"), "-o", str(executable)],
        cwd=ROOT,
        check=True,
    )
    return executable


def read_votes(path: Path) -> np.ndarray:
    rows: list[list[int]] = []
    with path.open("r", newline="", encoding="utf-8-sig") as vote_file:
        for line_number, row in enumerate(csv.reader(vote_file), start=1):
            if not row or all(not value.strip() for value in row):
                continue
            try:
                spins = [int(value.strip()) for value in row]
            except ValueError as error:
                raise ValueError(f"Invalid integer in {path}, line {line_number}.") from error
            if len(spins) != len(JUSTICES) or any(spin not in (-1, 1) for spin in spins):
                raise ValueError(
                    f"Expected nine -1/+1 votes in {path}, line {line_number}."
                )
            rows.append(spins)
    if not rows:
        raise ValueError(f"No vote rows found in {path}.")
    return np.asarray(rows, dtype=float)


def read_cpp_results(output: str) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    lines = output.splitlines()
    try:
        matrix_heading = lines.index("Fitted couplings J_ij")
        majority_heading = lines.index("Majority-size probability")
    except ValueError as error:
        raise ValueError("Could not find expected result sections in C++ output.") from error

    coupling_rows = [line.split() for line in lines[matrix_heading + 2 : matrix_heading + 2 + 9]]
    if any(len(row) != 10 for row in coupling_rows):
        raise ValueError("Could not parse all nine rows of the fitted J matrix.")
    if [row[0] for row in coupling_rows] != JUSTICES:
        raise ValueError("Justice labels in C++ output do not match the expected order.")
    couplings = np.asarray([[float(value) for value in row[1:]] for row in coupling_rows])

    majority_rows = [
        line.split() for line in lines[majority_heading + 2 : majority_heading + 2 + 5]
    ]
    if any(len(row) < 3 or row[0] != SPLITS[index]
           for index, row in enumerate(majority_rows)):
        raise ValueError("Could not parse the C++ majority-probability table.")
    independent = np.asarray([float(row[1]) for row in majority_rows])
    pairwise = np.asarray([float(row[2]) for row in majority_rows])
    return couplings, independent, pairwise


def demo_correlations() -> np.ndarray:
    # Keep this in sync with make_demo_correlation_matrix() in main.cpp.
    matrix = np.eye(len(JUSTICES))
    for i in range(len(JUSTICES)):
        for j in range(i + 1, len(JUSTICES)):
            matrix[i, j] = matrix[j, i] = 0.84 if (i < 4) == (j < 4) else 0.30
    return matrix


def empirical_statistics(votes: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    # The C++ fit matches raw second moments <sigma_i sigma_j>, not centered Pearson r.
    correlations = votes.T @ votes / votes.shape[0]
    positive_votes = np.count_nonzero(votes == 1, axis=1)
    majority_sizes = np.maximum(positive_votes, votes.shape[1] - positive_votes)
    distribution = np.asarray(
        [np.count_nonzero(majority_sizes == size) for size in range(5, 10)],
        dtype=float,
    ) / votes.shape[0]
    return correlations, distribution


def annotate_heatmap(axis: plt.Axes, matrix: np.ndarray, precision: int = 2) -> None:
    for i in range(matrix.shape[0]):
        for j in range(matrix.shape[1]):
            axis.text(
                j,
                i,
                f"{matrix[i, j]:.{precision}f}",
                ha="center",
                va="center",
                fontsize=7,
                color="black",
            )


def make_plots(
    correlations: np.ndarray,
    couplings: np.ndarray,
    independent: np.ndarray,
    pairwise: np.ndarray,
    empirical_majorities: np.ndarray | None,
    title: str,
    output_path: Path,
    show: bool,
) -> None:
    figure, axes = plt.subplots(2, 2, figsize=(13, 10), constrained_layout=True)
    figure.suptitle(title, fontsize=15)

    correlation_axis = axes[0, 0]
    correlation_image = correlation_axis.imshow(
        correlations, cmap="RdBu_r", vmin=-1.0, vmax=1.0
    )
    correlation_axis.set_title(r"Input pair moments $C_{ij}=\langle\sigma_i\sigma_j\rangle$")
    correlation_axis.set_xticks(range(len(JUSTICES)), JUSTICES)
    correlation_axis.set_yticks(range(len(JUSTICES)), JUSTICES)
    annotate_heatmap(correlation_axis, correlations)
    figure.colorbar(correlation_image, ax=correlation_axis, fraction=0.046, pad=0.04)

    coupling_axis = axes[0, 1]
    coupling_limit = max(float(np.max(np.abs(couplings))), 0.01)
    coupling_image = coupling_axis.imshow(
        couplings, cmap="coolwarm", vmin=-coupling_limit, vmax=coupling_limit
    )
    coupling_axis.set_title(r"Fitted couplings $J_{ij}$")
    coupling_axis.set_xticks(range(len(JUSTICES)), JUSTICES)
    coupling_axis.set_yticks(range(len(JUSTICES)), JUSTICES)
    annotate_heatmap(coupling_axis, couplings, precision=2)
    figure.colorbar(coupling_image, ax=coupling_axis, fraction=0.046, pad=0.04)

    relation_axis = axes[1, 0]
    upper_triangle = np.triu_indices(len(JUSTICES), k=1)
    pair_correlations = correlations[upper_triangle]
    pair_couplings = couplings[upper_triangle]
    positive = pair_couplings >= 0.0
    relation_axis.scatter(
        pair_correlations[positive], pair_couplings[positive],
        color="#b44b42", label=r"$J_{ij}\geq 0$", alpha=0.85,
    )
    relation_axis.scatter(
        pair_correlations[~positive], pair_couplings[~positive],
        color="#397a9b", label=r"$J_{ij}<0$", alpha=0.85,
    )
    for index, (i, j) in enumerate(zip(*upper_triangle)):
        relation_axis.annotate(
            f"{JUSTICES[i]}-{JUSTICES[j]}",
            (pair_correlations[index], pair_couplings[index]),
            xytext=(3, 3),
            textcoords="offset points",
            fontsize=6,
            alpha=0.75,
        )
    relation_axis.axhline(0.0, color="0.45", linewidth=0.8)
    relation_axis.set_xlabel(r"Pair moment $C_{ij}$")
    relation_axis.set_ylabel(r"Fitted coupling $J_{ij}$")
    relation_axis.set_title("Pairwise relationship")
    relation_axis.legend(frameon=False)
    relation_axis.grid(alpha=0.2)

    majority_axis = axes[1, 1]
    x_positions = np.arange(len(SPLITS))
    bar_width = 0.24 if empirical_majorities is not None else 0.34
    series = [
        ("Independent", independent, "#7896ad"),
        ("Pairwise MaxEnt", pairwise, "#b44b42"),
    ]
    if empirical_majorities is not None:
        series.append(("Observed", empirical_majorities, "#58836b"))
    offset = (len(series) - 1) / 2.0
    for series_index, (label, values, color) in enumerate(series):
        positions = x_positions + (series_index - offset) * bar_width
        majority_axis.bar(positions, values, width=bar_width, label=label, color=color)
    majority_axis.set_xticks(x_positions, SPLITS)
    majority_axis.set_xlabel("Majority split")
    majority_axis.set_ylabel("Probability")
    majority_axis.set_title("Majority-size distribution")
    majority_axis.set_ylim(bottom=0.0)
    majority_axis.legend(frameon=False)
    majority_axis.grid(axis="y", alpha=0.2)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    figure.savefig(output_path, dpi=180, bbox_inches="tight")
    if show:
        plt.show()
    plt.close(figure)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run the C++ Ising fit and plot correlation, coupling, and majority results."
    )
    parser.add_argument(
        "votes_csv",
        nargs="?",
        type=Path,
        help="optional headerless CSV: one case per row, nine -1/+1 votes in justice order",
    )
    parser.add_argument("--executable", help="path to the compiled C++ program")
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "supreme_court_analysis.png",
        help="output image path (default: supreme_court_analysis.png)",
    )
    parser.add_argument("--show", action="store_true", help="also open the plot window")
    args = parser.parse_args()

    votes_path = args.votes_csv.expanduser().resolve() if args.votes_csv else None
    executable = resolve_executable(args.executable)
    command = [str(executable)]
    if votes_path is not None:
        command.append(str(votes_path))
    result = subprocess.run(command, cwd=ROOT, text=True, capture_output=True, check=True)

    couplings, independent, pairwise = read_cpp_results(result.stdout)
    if votes_path is None:
        correlations = demo_correlations()
        empirical_majorities = None
        title = "Supreme Court MaxEnt: illustrative demonstration data"
    else:
        votes = read_votes(votes_path)
        correlations, empirical_majorities = empirical_statistics(votes)
        title = f"Supreme Court MaxEnt: {votes.shape[0]} observed cases"

    output_path = args.output.expanduser()
    if not output_path.is_absolute():
        output_path = (Path.cwd() / output_path).resolve()
    make_plots(
        correlations,
        couplings,
        independent,
        pairwise,
        empirical_majorities,
        title,
        output_path,
        args.show,
    )
    print(f"Plot saved to: {output_path}")
    if votes_path is None:
        print("Note: this is illustrative demo data, not the paper's raw court dataset.")


if __name__ == "__main__":
    main()