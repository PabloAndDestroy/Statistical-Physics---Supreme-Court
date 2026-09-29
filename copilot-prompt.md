# GitHub Copilot Prompt: Supreme Court MaxEnt Model Architecture

Below is the complete, structured prompt designed for GitHub Copilot Chat or inline completion.

```markdown
Role: Senior C++ Software Architect and Computational Physicist.

Task: Generate a clean, modern C++ (C++20 compliant) program that implements a Pairwise Maximum Entropy Model (Ising Spin Glass) to analyze the voting behavior of the 9 justices of the US Supreme Court, based on the research paper "Statistical Mechanics of the US Supreme Court" (Lee, Broedersz, & Bialek).

Please follow the step-by-step architectural guide below to build the complete, self-contained implementation:

---

### 1. TECHNICAL STACK & MODERN C++ STANDARDS
- Language Standard: C++20.
- Standard Library Usage: STL containers (`std::vector`, `std::array`, `std::string`), `<cmath>`, `<iomanip>`, `<iostream>`, `<algorithm>`.
- Best Practices: RAII principles, zero manual memory allocation (`new`/`delete`), pass large objects by const reference (`const std::vector<T>&`), const-correctness on member functions, and explicit type declarations.

---

### 2. DOMAIN & PHYSICS FORMULATION
- System Size: N = 9 justices (e.g., Stevens, Ginsburg, Souter, Breyer, O'Connor, Kennedy, Rehnquist, Scalia, Thomas).
- State Space: 2^9 = 512 total binary spin configurations \vec{\sigma} \in \{-1, +1\}^9.
- Energy Function: E(\vec{\sigma}) = -\sum_{i=1}^N h_i \sigma_i - \frac{1}{2}\sum_{i \neq j} J_{ij} \sigma_i \sigma_j
- Probability Distribution: P(\vec{\sigma}) = \frac{e^{-E(\vec{\sigma})}}{Z}, where Z = \sum_{\vec{\sigma}} e^{-E(\vec{\sigma})}.
- Fitting Criterion: Iterative gradient descent to match target individual means <\sigma_i> and pairwise correlations C_{ij} = <\sigma_i \sigma_j>.

---

### 3. STEP-BY-STEP MODULE REQUIREMENTS

Please organize the code into the following logical sections:

#### STEP 1: Includes & Global Constants
- Include necessary headers (`<iostream>`, `<vector>`, `<array>`, `<cmath>`, `<iomanip>`, `<string>`, `<algorithm>`).
- Define constant `N = 9` and `NUM_STATES = 1 << N` (512).
- Define a constant vector/array of strings for justice labels in ideological order: 
  `{"JS", "RG", "DS", "SB", "SO", "AK", "WR", "AS", "CT"}`.

#### STEP 2: Data Structures (`SpinState`)
- Define a `struct SpinState` containing `std::array<int, N> spins` representing votes (+1 for majority/conservative, -1 for dissent/liberal).
- Implement a helper function `generate_all_states()` that generates all 512 spin states using bitwise operations (`(state_idx >> i) & 1`).

#### STEP 3: Model Class (`SupremeCourtMaxEnt`)
Create a class `SupremeCourtMaxEnt` with the following private members and public methods:
- Private Members:
  - `std::vector<SpinState> states_`: Reference list of all 512 states.
  - `std::vector<double> h_`: Local fields (size 9).
  - `std::vector<std::vector<double>> J_`: Coupling matrix (9x9, symmetric, zero diagonal).
  - `std::vector<double> P_model_`: Probability distribution over the 512 states.
  - `double Z_`: Partition function.

- Public Methods:
  1. Constructor: Initializes states, zero-allocates fields `h_` and matrix `J_`.
  2. `compute_energy(const SpinState& state) const -> double`: Computes E(\vec{\sigma}) according to the Ising energy formula.
  3. `compute_probabilities() -> void`: Computes exact energies for all 512 states, applies log-sum-exp stabilization for numerical safety, sums the partition function Z, and normalizes `P_model_`.
  4. `fit(const std::vector<double>& mean_target, const std::vector<std::vector<double>>& C_target, double lr = 0.05, int max_iters = 3000) -> void`:
     - Runs an iterative gradient descent loop updating `h_i` and `J_ij` until maximum correlation error < 1e-5 or max iterations reached.
  5. Getters: `get_J() const`, `get_probabilities() const`, `get_h() const`.

#### STEP 4: Analysis & Statistics Functions
- Implement a function `compute_majority_distribution()`:
  - Takes state probabilities and computes the probability distribution P(k) for majorities of size k \in \{5, 6, 7, 8, 9\}.
  - Computes both for the Independent Voter Model P^{(1)} (uniform baseline) and the Pairwise Model P^{(2)}.

#### STEP 5: Main Function (`main`)
- Define the empirical 9x9 correlation matrix C_{ij} for the 2nd Rehnquist Court.
- Instantiating and fitting the `SupremeCourtMaxEnt` model.
- Format and print:
  1. The fitted effective coupling matrix J_{ij} formatted cleanly using `<iomanip>` (`std::setw` and `std::fixed`).
  2. A side-by-side comparative table of majority voting sizes P(k) comparing:
     - Majority Size k (5-4, 6-3, 7-2, 8-1, 9-0 Unanimous).
     - Independent Model P^{(1)}.
     - Pairwise MaxEnt Model P^{(2)}.
     - Empirical Court Data reference.

---

### 4. CODE QUALITY & FORMATTING INSTRUCTIONS
- Add brief, informative inline comments explaining physical/mathematical equations where applied.
- Ensure the code compiles cleanly as a single-file executable (e.g., `g++ -std=c++20 main.cpp -o supreme_court`).
- Keep code clean, modular, well-indented, and easy to read for computational physics and software engineering demonstrations.
```
