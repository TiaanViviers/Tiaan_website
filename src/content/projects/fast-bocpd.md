---
title: Fast Bayesian Online Changepoint Detection
summary: A C-accelerated Python library for detecting regime changes in streaming data while maintaining a full Bayesian posterior over how long the current regime has lasted.
year: 2026
category: Statistical Computing
featured: true
order: 1
technologies:
  - Python
  - C99
  - Bayesian Inference
  - Sequential Algorithms
  - NumPy
links:
  repository: https://github.com/TiaanViviers/Fast_BOCPD
  package: https://pypi.org/project/fast-bocpd/
  documentation: https://fast-bocpd.readthedocs.io/
---

## Overview

Streaming systems rarely remain stationary. Means shift, volatility changes, event rates jump, and previously stable behaviour can break. Offline changepoint methods can inspect an entire series before deciding where one regime ended and another began, but this is too costly for large and time intesive systems.

Fast BOCPD is a high-performance implementation of Bayesian Online Changepoint Detection, based on the framework of Adams and MacKay. Rather than returning only a heuristic anomaly score, it maintains a full posterior over run length, how long the current regime has lasted, with changepoint probability equal to the posterior mass at run length zero.

What the user gets back is concrete: the full run-length posterior, a changepoint probability, a MAP run-length estimate, and debounced changepoint events from a higher-level streaming detector.

I built it as a complete statistical-computing library: a C99 inference core, a Python API, multiple conjugate observation models, extensive tests and benchmarks, documentation, and a public package release.

## Why I built it

I was busy with another project and realised that I needed BOCPD. For the specific application that i was interested in, I needed an implementation that could process large streams under tight compute and memory constraints, without depending on a GPU stack. What I found were either heavy PyTorch implementations or slow pure-Python versions.

After many hours of research, I realised that the math is conceptually clean, but a straightforward implementation grows more expensive as the number of possible run lengths increases. Long streams also expose numerical problems that are easy to overlook in a short research prototype.

I wanted to understand not only the algorithm, but what it would take to run continuously:

- without numerical underflow;
- without storing the full history;
- with predictable memory and latency;
- across several types of data.

The project therefore became as much about numerical and software design as about Bayesian inference.

## The algorithm

At every observation, the system maintains one hypothesis for each plausible current run length. Formally, it tracks

$$P(r_t \mid x_{1:t})$$

where $r_t$ is the time since the last changepoint. The probability that a new regime has just begun is then

$$P(r_t = 0 \mid x_{1:t}).$$

For every surviving run-length hypothesis, it:

1. computes the predictive probability of the new observation;
2. extends the existing regime with probability determined by the hazard function;
3. assigns probability to a new regime beginning at run length zero;
4. normalises the resulting distribution;
5. updates the sufficient statistics associated with each hypothesis.

Version 1 uses a constant hazard, which places a geometric prior on segment length: a simple, interpretable timescale for how often changepoints are expected a priori.

With conjugate prior–likelihood pairs, model parameters are integrated out analytically. This avoids an inner optimisation or sampling step after each observation.

A critical implementation detail is the ordering of those operations. Continuation probabilities must use the sufficient statistics *before* the current observation is added, while the changepoint branch must use the prior predictive. Updating the statistics too early produces a plausible-looking but mathematically incorrect filter.

On synthetic streams, the behaviour is easy to see: during a stable regime the posterior mass drifts toward longer run lengths; after a clear shift — for example a sudden jump in mean — probability collapses toward $r_t = 0$.

## Bounded online inference

A full BOCPD recursion allows the run-length support to grow with time. That eventually increases both memory and compute.

Fast BOCPD uses a configurable maximum run length $R$, giving:

- $O(R)$ memory;
- $O(T \cdot R)$ time over a stream of length $T$;
- stable per-observation cost once the truncation limit is reached.

The trade-off is explicit: posterior mass beyond the maximum run length is discarded. A limit that is too small can blunt sensitivity in long, stable regimes; an unnecessarily large limit wastes computation. Rather than hiding that compromise, the API exposes it as part of the model configuration.

All recursive probabilities are represented in log space and normalised with log-sum-exp, which prevents the gradual underflow that would otherwise appear when multiplying small probabilities over long streams. The implementation also uses double-buffered state: current and next-step arrays exchange pointers rather than repeatedly copying full histories.

## From Python prototype to C core

The project began as a Python implementation used to verify the recursion and model behaviour. That prototype was useful for correctness, but not fast enough for the streaming library I wanted. I moved the inference hot path into C99 while keeping Python as the public interface.

The final architecture is intentionally thin:

- Python validates inputs and exposes a familiar object-oriented API;
- ctypes maps Python structures onto the C ABI;
- C owns the run-length recursion, sufficient statistics, and predictive calculations;
- NumPy receives the posterior arrays without a large runtime dependency stack.

I deliberately avoided requiring PyTorch, Cython, or pybind11. The runtime depends primarily on NumPy and the compiled library. That separation preserves Python ergonomics while keeping repeated per-hypothesis work outside the interpreter.

## Observation model architecture

The first implementation supported Gaussian observations. Expanding the library forced a deeper decision: observation models should not be hard-coded into the inference loop.

I refactored the C core around a small model interface:

- initialise prior sufficient statistics;
- update statistics with a new observation;
- calculate the predictive log-density;
- copy model state;
- report the required statistics-buffer size.

The inference engine therefore understands run lengths and probability mass, while each observation model owns its statistical details. The same recursion can operate over very different data types without duplicating the central algorithm.

The released library includes seven conjugate variants:

- **Gaussian / Normal–Inverse-Gamma** — default model when segment mean and variance may both change.
- **Student-t / Normal–Gamma** — outlier-resistant model for heavy-tailed streams; extreme observations receive lower influence through adaptive weighting rather than automatically forcing a regime change.
- **Student-t degree-of-freedom mixture** — grid over several tail assumptions via log-space mixtures; more flexible, computationally more expensive.
- **Poisson–Gamma** — changing event or count rates.
- **Bernoulli–Beta** — changes in binary event probabilities.
- **Binomial–Beta** — changing success rates when each observation represents multiple trials.
- **Gamma–Gamma** — positive continuous measurements such as durations, intensities, or scale-like quantities.

## Turning a posterior into an alert

The Bayesian core produces a distribution, not a product decision. Many practical systems ultimately want an event resembling: *a meaningful regime change probably occurred here*.

`OnlineChangeDetector` is a higher-level layer over the posterior. It combines:

- a threshold on $P(r_t = 0)$;
- a reset in the maximum-a-posteriori run length;
- a cooldown period that prevents one transition from generating repeated alerts.

The default probability threshold is linked to the configured hazard and a Bayes-factor interpretation, rather than being an arbitrary fixed number.

This detector is intentionally separate from the underlying filter. Users who need the full posterior can work directly with `BOCPD`; users building monitoring systems can consume debounced changepoint events.

A posterior is not yet a product interface.

## Performance

The largest speed improvements did not come from one trick. They came from combining several disciplined decisions:

- a C99 hot path;
- bounded run-length support;
- log-space recursion;
- pointer-swapped state buffers;
- cached hazard quantities;
- reduced Python-to-C call overhead;
- batch updates that remain inside C;
- model-specific compact sufficient statistics.

On my benchmark machine, the Gaussian model processed approximately 26,000 observations per second on a 100,000-observation stream. Depending on the observation model, measured throughput ranged roughly from:

- ~34,000 obs/s for Bernoulli data;
- ~25,000–26,000 for Gaussian data;
- ~22,000 for fixed-$\nu$ Student-t;
- ~15,000 for Binomial data;
- ~3,500 for the Student-t degree-of-freedom mixture.

The batch interface further reduced FFI overhead by keeping the loop inside the C library.

Against other open implementations, the library showed roughly one to two orders of magnitude improvement over common Python BOCPD packages under my test setup. Those comparisons are not perfectly interchangeable — some competing libraries use different truncation rules, or even different changepoint algorithms entirely — but they confirmed that the architectural choices produced a meaningful performance gain.

## Correctness and testing

A fast Bayesian library that returns the wrong posterior is not useful.

Testing covered both the mathematical and systems layers: predictive densities for each conjugate model, posterior normalisation, run-length transitions, sufficient-statistic updates, synthetic regime shifts, invalid observations for discrete models, Python–C agreement, streaming and batch behaviour, boundary conditions at the truncation limit, and memory safety.

The C suite contains about 98 tests, supported by hundreds of Python tests. The model-interface refactor was checked under AddressSanitizer, UndefinedBehaviorSanitizer, and Valgrind before being extended across the full model library.

That discipline mattered because each run-length hypothesis carries its own model state. A small buffer-layout or copy error can corrupt results far from the original mistake.

## Applied demonstration

I also built a chronological financial-volatility example using US30 data. Earlier history configured the detector; later observations were streamed in temporal order.

The point was not to claim a trading strategy or a definitive financial-regime study. It was to show that the same API works on a real, long-running signal where volatility regimes change meaningfully around crisis periods.

Synthetic examples across the observation-model family make the complementary point: you can watch the posterior grow during stable periods and collapse toward zero when a shift occurs.

## Shipping the library

The final result was not left as a repository prototype. Built across late 2025 and released as version 1.0 in 2026, the project shipped with:

- an installable package on PyPI;
- public documentation on ReadTheDocs;
- mathematical derivations and API references;
- notebooks, examples, and benchmark reports;
- a finance streaming demonstration;
- a minimal NumPy-facing interface.


Packaging, documentation, error handling, and stable interfaces are what turned a private experiment into software that can hopefully be useful to someone else.

## Limitations

The first major limitation is the assumption that observations are conditionally independent within each regime. The current models do not explicitly represent autoregressive behaviour inside a segment.

Version 1 also uses a constant hazard function, hard run-length truncation, univariate observation models, and conjugate model families.

Detection quality still depends on the match between the data, prior, hazard scale, and observation model. Misspecification may delay a changepoint or spread its posterior mass over several observations.

Benchmarks were collected on my own hardware and should be treated as implementation evidence rather than universal performance guarantees. Comparisons with offline changepoint packages are illustrative rather than strictly equivalent.

Richer hazard functions, next-observation prediction, and multivariate models remain natural future extensions.

## Lessons learned

This project taught me that numerical discipline is not separate from statistical correctness. The lessons that stayed with me:

- log-space probability calculations are essential for long-running Bayesian systems;
- operation ordering can matter as much as the equations themselves;
- bounded compute requires an explicit statistical trade-off, not a hidden heuristic;
- a plugin model interface scales better than expanding a monolithic algorithm;
- compiler flags must be benchmarked rather than trusted;
- documentation, packaging, and tests become part of the algorithm once other people depend on it.

The difference between reproducing a paper and shipping a library often lies in details such as buffer swaps, input validation, sanitizers, and deleting optimisations that did not work.
