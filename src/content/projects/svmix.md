---
title: "svmix: Ensemble Stochastic Volatility Filter"
summary: A high-performance C and Python library for online stochastic-volatility estimation, combining an adaptive ensemble of particle filters with Bayesian model averaging to track changing market regimes without periodic refitting.
year: 2026
category: Statistical Computing
featured: true
order: 3
technologies:
  - C
  - Python
  - Particle Filtering
  - Bayesian Model Averaging
  - Stochastic Volatility
links:
  repository: https://github.com/TiaanViviers/svmix
---

## Overview

In financial markets, volatility is not a constant background property. Quiet stretches give way to crises, persistence changes, tails become heavier, and a model that explained last month’s returns can be badly wrong this month.

That creates a practical problem for any system that needs a live volatility estimate — risk controls, position sizing, trading models, or research pipelines. Classical approaches often fit one model to a recent window and then periodically re-estimate it. Between refits the model is frozen. During the refit it is offline. Under sudden regime change, both behaviours hurt.

`svmix` was built around a different idea. Instead of committing to a single stochastic-volatility model, it keeps an ensemble of candidates alive in parallel. Each candidate assumes a different combination of persistence, volatility-of-volatility and tail thickness. Each runs its own particle filter. As new log returns arrive, the ensemble updates its belief in each candidate from predictive performance.

The output is a streaming volatility estimate that can shift weight between competing assumptions without stopping for a new batch fit. The same process also exposes how uncertain the system is about the current regime, not only what volatility it currently believes.

## Problem

Offline methods can look back over a long history and revise everything. Online settings cannot. Each new observation must update the belief immediately, with latency low enough for practical use.

A single fixed-parameter stochastic-volatility model is brittle: if its persistence or tail assumption is wrong, filtered volatility drifts away from reality. GARCH-style models are widely used and easy to baseline against, but they typically need periodic re-estimation and still struggle when the market moves between calm and crisis behaviour.

The challenge was therefore:

- keep the estimation online and incremental;
- remain statistically principled rather than purely heuristic;
- adapt when the market changes regime;
- stay fast enough for continuous one-minute streams;
- remain interpretable enough to inspect why the estimate moved.

## The model

Each ensemble member uses a latent log-variance model.

Hidden volatility follows a mean-reverting AR(1) process. Three parameters matter most:

- the long-run log-variance level;
- persistence, $\phi$ — how sticky volatility is once it moves;
- volatility of volatility, $\sigma_h$ — how violently that latent process itself fluctuates.

Observed log returns follow a Student-$t$ distribution whose scale is set by the latent variance.

The Student-$t$ observation model was a deliberate choice. Financial returns contain large shocks. A Gaussian likelihood can treat every extreme move as evidence that volatility itself has jumped. Heavier tails let the filter absorb unusual returns without immediately rewriting the entire regime story.

Inputs are expected to be regularly spaced log returns. That matches the model’s mathematical assumptions and keeps the filtering problem clean; irregular tick data or missing observations need preprocessing outside the library.

## Approach

Every candidate model owns a bootstrap sequential-importance-resampling particle filter, implemented through my separate `fastpf` engine. Particle filters are useful here because the latent volatility path is nonlinear and non-Gaussian: closed-form Kalman-style updates do not apply cleanly, but a cloud of weighted particles can approximate the filtering distribution as observations arrive.

For each new log return, a model:

1. propagates its particles through the latent-volatility transition;
2. evaluates the Student-$t$ observation likelihood in the log domain;
3. normalises particle weights numerically;
4. computes effective sample size;
5. resamples when particle degeneracy crosses a threshold;
6. returns its filtered volatility belief and one-step predictive likelihood.

That predictive likelihood becomes the evidence used to update ensemble weights.

Each model maintains a discounted evidence score:

$$
S_i^{(t)}
=
\lambda S_i^{(t-1)}
+
\log \hat{p}(r_t \mid r_{1:t-1}, M_i)
$$

Scores are converted into probabilities with a tempered softmax. A small anti-starvation floor prevents any model from receiving exactly zero weight, so a previously weak candidate can recover if the market enters a regime that suits it.

The three controls have distinct jobs:

- $\lambda$ decides how quickly old evidence is forgotten;
- $\beta$ decides how aggressively the ensemble concentrates on its current favourite;
- $\varepsilon$ preserves enough diversity for recovery after regime changes.

The final belief combines two kinds of uncertainty: disagreement among particles inside a model, and disagreement among models themselves, using the law of total variance. That matters in practice. A sharp estimate with one dominant model is different from a similar mean produced by several competing regimes still fighting for weight.

## Architecture

The project was split into a reusable statistical core and an accessible Python interface.

The C layer contains:

- an opaque public API;
- ensemble orchestration;
- stochastic-volatility transition and likelihood callbacks;
- one embedded `fastpf` instance per candidate model;
- log-domain numerical utilities;
- OpenMP parallelism across models;
- binary checkpointing with full particle and RNG state.

The Python package wraps that API with `ctypes` and exposes higher-level objects for configuration, parameter grids and filtered beliefs. Parameter grids can be built as linear spans or Cartesian products, so research and production configurations stay explicit rather than hand-tuned one model at a time.

Alongside volatility, the Python layer can surface ensemble diagnostics such as:

- model-weight entropy;
- effective number of active models;
- weighted persistence;
- weighted tail thickness;
- weighted volatility-of-volatility.

These are useful beyond monitoring. They describe not only the volatility estimate, but also how ambiguous the current regime appears — a distinction that matters if the downstream consumer is a trading model or risk system rather than a plot.

Checkpointing was treated as part of the algorithm rather than an afterthought. The binary `SVMIXCP1` format stores the ensemble, particles and RNG state, so a resumed process can continue deterministically from the same point. Identical seeds and identical data are intended to produce bitwise-identical results. For a sequential Monte Carlo system, that reproducibility is part of correctness, not polish.

## Experiments

The evaluation was built around three design questions:

1. How much does the number of candidate models matter?
2. How much does the number of particles per model matter?
3. How wide should the parameter grid be when regimes change?

Synthetic experiments covered persistent volatility, high volatility-of-volatility, heavy tails and mid-stream regime changes, with known ground-truth latent paths.

The most surprising result was that ensemble diversity produced much larger gains than additional particles inside each model.

Moving from one candidate model to five produced substantial reductions in estimation error. Increasing particle count from 100 to 10,000 changed RMSE by less than one percent in the reported experiments.

That finding reshaped the design. Extra Monte Carlo precision inside a misspecified model helps less than giving the mixture several plausible models to choose among.

Narrow parameter grids performed well when the data-generating regime was already known, but became brittle under shifts. Wider grids sacrificed a little precision in stable conditions while producing substantially better coverage during crisis transitions.

The practical conclusion was:

> **More models, not more particles.**

Wide grids generally needed around 100–150 models to cover the space effectively. Pushing toward roughly 200 models produced diminishing returns.

## Real-data evaluation

The system was then tested on one-minute US30 returns across six market regimes spanning roughly 2008 to 2021. Annualised volatility in those windows ranged from about 4.2% in calm periods to 47.3% in crisis — an order-of-magnitude stress range for any online volatility method.

A wide ensemble with 150 models and 500 particles per model achieved:

- predictive log-likelihood of approximately 6.37;
- interval coverage of approximately 96.9%;
- VaR violation rate of approximately 2.7%;
- latency of roughly 2 milliseconds per observation.

Against GARCH models periodically refitted every 50 observations:

| Model | Mean PLL | Coverage | VaR violations |
|---|---:|---:|---:|
| GARCH-Normal | 6.17 | 93.9% | 4.8% |
| GARCH-$t$ | 5.69 | 94.1% | 4.6% |
| svmix-wide | 6.36 | 96.6% | 3.0% |

The predictive-likelihood improvement was around 3% relative to Gaussian GARCH and roughly 12% relative to Student-$t$ GARCH. Coverage was slightly conservative, and VaR violations sat below the nominal 5% rate — safer for risk use, if not perfectly calibrated to a Gaussian interval story.

The most important long-run test processed 1,736,469 one-minute observations across about five years with no periodic parameter re-estimation. Predictive performance and coverage held up with little evidence of drift. The ensemble concentrated onto a small effective set of models, but did not collapse onto a single survivor. That distinction mattered: adaptation without irreversible monoculture.

In other words, the mixture did the work that would otherwise have been done by repeated batch refits.

## Performance

Different configurations trade latency against ensemble breadth.

A low-latency setup with 20 models and 250 particles processed roughly 2,100 observations per second, or about 0.48 milliseconds per update — enough for demanding real-time use.

Larger research and production setups with 100–150 models and 500 particles ran around 520–680 observations per second, with latency near 2 milliseconds on the benchmark machine.

OpenMP parallelises across candidate models. The underlying filters use custom deterministic random-number generation and log-domain calculations to keep the numerics stable under long streams.

## Role and ownership

I designed and implemented the project end to end, including:

- the adaptive ensemble-weighting scheme;
- stochastic-volatility and Student-$t$ model callbacks;
- log-domain likelihood and softmax calculations;
- the C library architecture and opaque ABI;
- integration with the `fastpf` particle-filtering engine;
- deterministic checkpointing;
- Python bindings and feature extraction;
- synthetic regime experiments;
- throughput benchmarking;
- real-data evaluation against GARCH baselines.

The project was an opportunity to combine statistical modelling with the part of applied work I enjoy most: turning an algorithm into a complete, tested and usable system.

## Limitations

The current release estimates volatility only. It does not model the conditional mean or drift of returns.

Inputs must be regularly spaced log returns, so missing observations and irregular tick-time data require preprocessing outside the library.

The ensemble can only assign weight to models inside its parameter grid. It can adapt between candidate regimes, but it cannot invent parameters outside the supplied range.

The wide-grid experiments also exposed modelling and implementation caveats: sensitivity to the long-run variance parameter, annualisation assumptions in the Python convenience API, and small inconsistencies between the theoretical documentation and implementation details. Those are the kinds of issues that matter more in production than on a synthetic demo.

The library includes extensive local tests and sanitizer targets, but it was not released on PyPI and did not yet have continuous integration at the time described.

## Lessons learned

The central lesson was that adaptation does not always require continuous parameter re-estimation.

A sufficiently diverse collection of simple models, combined using recent predictive evidence, can remain useful across very different regimes while keeping updates fast and interpretable.

I also learned that:

- model diversity can be more valuable than additional Monte Carlo precision;
- a narrow model grid may optimise the current regime while failing the next one;
- anti-collapse mechanisms are essential in non-stationary ensembles;
- numerical details such as log-sum-exp, ESS thresholds and underflow handling decide whether elegant statistical ideas survive contact with long streams;
- checkpointing and reproducibility belong inside a sequential algorithm’s design;
- statistical software becomes much more valuable when uncertainty diagnostics are exposed as usable features rather than left buried in internal state.
