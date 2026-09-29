#include <algorithm>
#include <array>
#include <cmath>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <limits>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>

constexpr std::size_t N = 9;
constexpr std::size_t NUM_STATES = 1U << N;
constexpr double kTolerance = 1.0e-5;

const std::array<std::string, N> JUSTICES{
    "JS", "RG", "DS", "SB", "SO", "AK", "WR", "AS", "CT"};

struct SpinState {
    std::array<int, N> spins{};
};

std::vector<SpinState> generate_all_states() {
    std::vector<SpinState> states(NUM_STATES);
    for (std::size_t state_index = 0; state_index < NUM_STATES; ++state_index) {
        for (std::size_t justice = 0; justice < N; ++justice) {
            // A set bit denotes a +1 spin; an unset bit denotes a -1 spin.
            states[state_index].spins[justice] =
                ((state_index >> justice) & 1U) != 0U ? 1 : -1;
        }
    }
    return states;
}

struct ModelMoments {
    std::array<double, N> means{};
    std::array<std::array<double, N>, N> correlations{};
};

class SupremeCourtMaxEnt {
public:
    SupremeCourtMaxEnt()
        : states_(generate_all_states()),
          h_(N, 0.0),
          J_(N, std::vector<double>(N, 0.0)),
          P_model_(NUM_STATES, 1.0 / static_cast<double>(NUM_STATES)) {
        compute_probabilities();
    }

    double compute_energy(const SpinState& state) const {
        double energy = 0.0;
        for (std::size_t i = 0; i < N; ++i) {
            energy -= h_[i] * static_cast<double>(state.spins[i]);
            for (std::size_t j = 0; j < N; ++j) {
                // The factor 1/2 compensates for counting each symmetric pair twice.
                energy -= 0.5 * J_[i][j] * static_cast<double>(state.spins[i]) *
                          static_cast<double>(state.spins[j]);
            }
        }
        return energy;
    }

    void compute_probabilities() {
        std::array<double, NUM_STATES> log_weights{};
        double maximum_log_weight = -std::numeric_limits<double>::infinity();

        for (std::size_t index = 0; index < NUM_STATES; ++index) {
            log_weights[index] = -compute_energy(states_[index]);
            maximum_log_weight = std::max(maximum_log_weight, log_weights[index]);
        }

        double scaled_partition = 0.0;
        for (double log_weight : log_weights) {
            scaled_partition += std::exp(log_weight - maximum_log_weight);
        }

        // Subtracting the largest log weight prevents overflow during normalization.
        log_Z_ = maximum_log_weight + std::log(scaled_partition);
        Z_ = std::exp(log_Z_);
        for (std::size_t index = 0; index < NUM_STATES; ++index) {
            P_model_[index] =
                std::exp(log_weights[index] - maximum_log_weight) / scaled_partition;
        }
    }

    void fit(const std::vector<double>& mean_target,
             const std::vector<std::vector<double>>& C_target,
             double lr = 0.05,
             int max_iters = 3000) {
        validate_targets(mean_target, C_target, lr, max_iters);

        double step_size = lr;
        last_fit_iterations_ = 0;
        for (int iteration = 0; iteration < max_iters; ++iteration) {
            const ModelMoments current = compute_moments();
            const double error = maximum_moment_error(current, mean_target, C_target);
            if (error < kTolerance) {
                last_fit_iterations_ = iteration;
                return;
            }

            std::array<double, N> mean_gradient{};
            std::array<std::array<double, N>, N> correlation_gradient{};
            double gradient_norm_squared = 0.0;
            for (std::size_t i = 0; i < N; ++i) {
                mean_gradient[i] = mean_target[i] - current.means[i];
                gradient_norm_squared += mean_gradient[i] * mean_gradient[i];
                for (std::size_t j = i + 1; j < N; ++j) {
                    correlation_gradient[i][j] =
                        C_target[i][j] - current.correlations[i][j];
                    gradient_norm_squared += correlation_gradient[i][j] *
                                             correlation_gradient[i][j];
                }
            }

            const std::vector<double> old_h = h_;
            const std::vector<std::vector<double>> old_J = J_;
            const double current_log_likelihood =
                log_likelihood(mean_target, C_target);
            bool accepted = false;

            // Backtracking keeps the gradient-ascent step improving the data likelihood.
            for (int line_search = 0; line_search < 40; ++line_search) {
                h_ = old_h;
                J_ = old_J;
                for (std::size_t i = 0; i < N; ++i) {
                    h_[i] += step_size * mean_gradient[i];
                    for (std::size_t j = i + 1; j < N; ++j) {
                        const double update = step_size * correlation_gradient[i][j];
                        J_[i][j] += update;
                        J_[j][i] += update;
                    }
                }

                compute_probabilities();
                const double candidate_log_likelihood =
                    log_likelihood(mean_target, C_target);
                if (candidate_log_likelihood >= current_log_likelihood +
                        1.0e-4 * step_size * gradient_norm_squared ||
                    gradient_norm_squared == 0.0) {
                    accepted = true;
                    step_size = std::min(lr, step_size * 1.2);
                    break;
                }
                step_size *= 0.5;
            }

            if (!accepted) {
                h_ = old_h;
                J_ = old_J;
                compute_probabilities();
                last_fit_iterations_ = iteration;
                return;
            }
            last_fit_iterations_ = iteration + 1;
        }
    }

    const std::vector<double>& get_h() const { return h_; }
    const std::vector<std::vector<double>>& get_J() const { return J_; }
    const std::vector<double>& get_probabilities() const { return P_model_; }
    int get_last_fit_iterations() const { return last_fit_iterations_; }

    double get_max_moment_error(const std::vector<double>& mean_target,
                               const std::vector<std::vector<double>>& C_target) const {
        return maximum_moment_error(compute_moments(), mean_target, C_target);
    }

private:
    std::vector<SpinState> states_;
    std::vector<double> h_;
    std::vector<std::vector<double>> J_;
    std::vector<double> P_model_;
    double Z_ = 1.0;
    double log_Z_ = 0.0;
    int last_fit_iterations_ = 0;

    ModelMoments compute_moments() const {
        ModelMoments moments;
        for (std::size_t state_index = 0; state_index < NUM_STATES; ++state_index) {
            const double probability = P_model_[state_index];
            const auto& spins = states_[state_index].spins;
            for (std::size_t i = 0; i < N; ++i) {
                moments.means[i] += probability * static_cast<double>(spins[i]);
                for (std::size_t j = 0; j < N; ++j) {
                    moments.correlations[i][j] += probability *
                        static_cast<double>(spins[i] * spins[j]);
                }
            }
        }
        return moments;
    }

    double log_likelihood(const std::vector<double>& mean_target,
                          const std::vector<std::vector<double>>& C_target) const {
        double value = -log_Z_;
        for (std::size_t i = 0; i < N; ++i) {
            value += h_[i] * mean_target[i];
            for (std::size_t j = i + 1; j < N; ++j) {
                value += J_[i][j] * C_target[i][j];
            }
        }
        return value;
    }

    static double maximum_moment_error(
        const ModelMoments& moments,
        const std::vector<double>& mean_target,
        const std::vector<std::vector<double>>& C_target) {
        double maximum_error = 0.0;
        for (std::size_t i = 0; i < N; ++i) {
            maximum_error = std::max(
                maximum_error, std::abs(moments.means[i] - mean_target[i]));
            for (std::size_t j = i + 1; j < N; ++j) {
                maximum_error = std::max(maximum_error,
                    std::abs(moments.correlations[i][j] - C_target[i][j]));
            }
        }
        return maximum_error;
    }

    static void validate_targets(const std::vector<double>& mean_target,
                                 const std::vector<std::vector<double>>& C_target,
                                 double lr,
                                 int max_iters) {
        if (mean_target.size() != N || C_target.size() != N ||
            !std::isfinite(lr) || lr <= 0.0 || max_iters <= 0) {
            throw std::invalid_argument("Invalid target dimensions or fit settings.");
        }
        for (std::size_t i = 0; i < N; ++i) {
            if (C_target[i].size() != N || !std::isfinite(mean_target[i]) ||
                std::abs(mean_target[i]) > 1.0) {
                throw std::invalid_argument("Target means/correlations must be finite and 9x9.");
            }
            for (std::size_t j = 0; j < N; ++j) {
                if (!std::isfinite(C_target[i][j]) ||
                    std::abs(C_target[i][j]) > 1.0 ||
                    std::abs(C_target[i][j] - C_target[j][i]) > 1.0e-10) {
                    throw std::invalid_argument("Target correlation matrix must be finite, symmetric, and bounded.");
                }
            }
        }
    }
};

using MajorityDistribution = std::array<double, 5>;

MajorityDistribution compute_majority_distribution(
    const std::vector<double>& probabilities,
    const std::vector<SpinState>& states) {
    MajorityDistribution distribution{};
    for (std::size_t index = 0; index < probabilities.size(); ++index) {
        int positive_votes = 0;
        for (int spin : states[index].spins) {
            positive_votes += spin == 1 ? 1 : 0;
        }
        const int majority_size = std::max(positive_votes, static_cast<int>(N) - positive_votes);
        distribution[static_cast<std::size_t>(majority_size - 5)] += probabilities[index];
    }
    return distribution;
}

MajorityDistribution compute_independent_majority_distribution(
    const std::vector<double>& mean_target) {
    const std::vector<SpinState> states = generate_all_states();
    std::vector<double> probabilities(NUM_STATES, 0.0);
    for (std::size_t index = 0; index < NUM_STATES; ++index) {
        double probability = 1.0;
        for (std::size_t justice = 0; justice < N; ++justice) {
            const double positive_probability = 0.5 * (1.0 + mean_target[justice]);
            probability *= states[index].spins[justice] == 1
                ? positive_probability : 1.0 - positive_probability;
        }
        probabilities[index] = probability;
    }
    return compute_majority_distribution(probabilities, states);
}

std::vector<std::vector<double>> make_demo_correlation_matrix() {
    std::vector<std::vector<double>> correlations(N, std::vector<double>(N, 1.0));
    for (std::size_t i = 0; i < N; ++i) {
        for (std::size_t j = i + 1; j < N; ++j) {
            // Illustrative, realizable target: a common mode plus an ideological block mode.
            // It is not a digitization of the paper's 1994-2004 observations.
            const bool same_block = (i < 4) == (j < 4);
            correlations[i][j] = same_block ? 0.84 : 0.30;
            correlations[j][i] = correlations[i][j];
        }
    }
    return correlations;
}

struct VotingData {
    std::vector<double> mean_target = std::vector<double>(N, 0.0);
    std::vector<std::vector<double>> correlation_target =
        std::vector<std::vector<double>>(N, std::vector<double>(N, 0.0));
    MajorityDistribution empirical_majorities{};
    std::size_t sample_count = 0;
};

VotingData load_voting_csv(const std::string& path) {
    std::ifstream input(path);
    if (!input) {
        throw std::runtime_error("Could not open vote CSV: " + path);
    }

    std::vector<SpinState> observations;
    std::string line;
    std::size_t line_number = 0;
    while (std::getline(input, line)) {
        ++line_number;
        if (line.find_first_not_of(" \t\r\n") == std::string::npos) {
            continue;
        }

        SpinState observation;
        std::stringstream line_stream(line);
        std::string token;
        std::size_t justice = 0;
        while (std::getline(line_stream, token, ',')) {
            std::istringstream token_stream(token);
            int spin = 0;
            char extra_character = '\0';
            if (justice >= N || !(token_stream >> spin) ||
                (token_stream >> extra_character) || (spin != -1 && spin != 1)) {
                throw std::runtime_error("Expected nine comma-separated -1/+1 votes at CSV line " +
                                         std::to_string(line_number) + ".");
            }
            observation.spins[justice++] = spin;
        }
        if (justice != N) {
            throw std::runtime_error("Expected nine comma-separated -1/+1 votes at CSV line " +
                                     std::to_string(line_number) + ".");
        }
        observations.push_back(observation);
    }
    if (observations.empty()) {
        throw std::runtime_error("Vote CSV contains no observations.");
    }

    VotingData data;
    data.sample_count = observations.size();
    for (const SpinState& observation : observations) {
        int positive_votes = 0;
        for (std::size_t i = 0; i < N; ++i) {
            const int spin_i = observation.spins[i];
            data.mean_target[i] += static_cast<double>(spin_i);
            positive_votes += spin_i == 1 ? 1 : 0;
            for (std::size_t j = 0; j < N; ++j) {
                data.correlation_target[i][j] +=
                    static_cast<double>(spin_i * observation.spins[j]);
            }
        }
        const int majority_size = std::max(positive_votes, static_cast<int>(N) - positive_votes);
        data.empirical_majorities[static_cast<std::size_t>(majority_size - 5)] += 1.0;
    }
    const double inverse_sample_count = 1.0 / static_cast<double>(data.sample_count);
    for (std::size_t i = 0; i < N; ++i) {
        data.mean_target[i] *= inverse_sample_count;
        for (std::size_t j = 0; j < N; ++j) {
            data.correlation_target[i][j] *= inverse_sample_count;
        }
    }
    for (double& frequency : data.empirical_majorities) {
        frequency *= inverse_sample_count;
    }
    return data;
}

int main(int argc, char* argv[]) {
    try {
        if (argc > 2) {
            throw std::invalid_argument("Usage: supreme_court [votes.csv]");
        }

        const bool has_empirical_data = argc == 2;
        VotingData data;
        if (has_empirical_data) {
            data = load_voting_csv(argv[1]);
        } else {
            // The primary paper analysis symmetrizes votes, giving each justice zero mean.
            data.correlation_target = make_demo_correlation_matrix();
        }

        SupremeCourtMaxEnt model;
        model.fit(data.mean_target, data.correlation_target);

        std::cout << "Supreme Court pairwise maximum-entropy demonstration\n"
                  << "Justice order: JS RG DS SB SO AK WR AS CT\n"
                  << (has_empirical_data
                      ? "Input CSV observations: " + std::to_string(data.sample_count) + "\n"
                      : "Input: illustrative correlation matrix; not the paper's raw dataset\n")
                  << "Fit iterations: " << model.get_last_fit_iterations()
                  << ", max moment error: " << std::scientific << std::setprecision(3)
                  << model.get_max_moment_error(data.mean_target, data.correlation_target)
                  << "\n\n";

        std::cout << "Fitted couplings J_ij\n" << std::fixed << std::setprecision(3);
        std::cout << std::setw(5) << "";
        for (const std::string& justice : JUSTICES) {
            std::cout << std::setw(8) << justice;
        }
        std::cout << '\n';
        for (std::size_t i = 0; i < N; ++i) {
            std::cout << std::setw(5) << JUSTICES[i];
            for (std::size_t j = 0; j < N; ++j) {
                std::cout << std::setw(8) << model.get_J()[i][j];
            }
            std::cout << '\n';
        }

        const std::vector<SpinState> states = generate_all_states();
        const MajorityDistribution independent =
            compute_independent_majority_distribution(data.mean_target);
        const MajorityDistribution pairwise =
            compute_majority_distribution(model.get_probabilities(), states);
        const std::array<std::string, 5> majority_labels{
            "5-4", "6-3", "7-2", "8-1", "9-0"};

        std::cout << "\nMajority-size probability\n"
                  << std::setw(12) << "Split"
                  << std::setw(18) << "Independent P(1)"
                  << std::setw(20) << "Pairwise P(2)"
                  << std::setw(20) << "Paper reference" << '\n';
        for (std::size_t i = 0; i < majority_labels.size(); ++i) {
            std::cout << std::setw(12) << majority_labels[i]
                      << std::setw(17) << std::fixed << std::setprecision(4)
                      << independent[i]
                      << std::setw(20) << pairwise[i]
                      << std::setw(20);
            if (has_empirical_data) {
                std::cout << data.empirical_majorities[i];
            } else {
                std::cout << "--";
            }
            std::cout << '\n';
        }
        if (!has_empirical_data) {
            std::cout << "\nSupply votes.csv to compute empirical means, correlations, and majority frequencies.\n"
                      << "CSV format: one case per row, nine comma-separated -1/+1 votes in justice order.\n"
                      << "The paper reports approximate frequencies of ~16% for 5-4 and ~36-39% for 9-0.\n";
        }
    } catch (const std::exception& error) {
        std::cerr << "Error: " << error.what() << '\n';
        return 1;
    }
    return 0;
}