---
title: Bayesian Online Listwise Ranking
summary: An online Bayesian system for ranking roughly 1,400 trading configurations each day, implemented in Python and C11—and ultimately paused after a robustness audit showed that a strong static baseline was difficult to beat.
year: 2026
category: Quantitative Research
featured: true
order: 4
technologies:
  - Python
  - C11
  - Bayesian Inference
  - Online Learning
links:
  repository: https://github.com/TiaanViviers/BOLR
---

## Overview

Each trading day, this system had to choose one configuration from a fixed grid of roughly 1,400 entry and trailing-stop combinations.

Instead of periodically retraining a conventional model, I explored whether a Bayesian online ranker could maintain a posterior over the configuration surface, adapt as market conditions changed, and improve the quality of the top-ranked choice over time.

## The modelling idea

The configurations formed a structured two-dimensional grid rather than a collection of unrelated IDs. Neighbouring configurations often behaved similarly, while the exact daily winner moved aggressively.

I therefore modelled a smooth suitability surface over configuration space, with market context interacting with that geometry. The posterior was updated sequentially using Laplace-based Gaussian filtering after each day’s full outcome vector became available.

The decision had to be made before seeing the current day’s outcomes, so the replay system enforced a strict begin-day, decide, reveal-outcomes, finish-day sequence.

## Engineering the research system

The project was built in two layers:

- a frozen Python implementation that served as the mathematical reference;
- a pure C11 backend for inference, replay, Monte Carlo decisions, random-number generation and durable checkpoints.

Golden fixtures, restart tests and explicit ready-versus-awaiting-outcome checkpoint states were used to ensure that the faster implementation remained consistent with the reference model.

## Experiments

Two observation models were explored:

- a soft-target generalized Bayesian update based on transformed daily PnL;
- an ordered-partition ranking model designed to handle ties and plateaus more naturally.

I also tested posterior-mean decisions, probability-best policies, Thompson sampling and adaptive process-noise inflation.

Several ideas were rejected along the way. Pure additive market features cancelled inside the ranking softmax, exact all-pair ranking updates were too expensive at full scale, and more aggressive adaptive policies often produced diversity without useful performance.

## Results

The strongest static configuration earned a total replay PnL of $1,055.

One fixed Thompson-sampling run initially appeared promising, finishing roughly 359 ahead of that baseline. Instead of treating that as evidence of success, I reran the policy across 30 independent random streams.

Only 8 of the 30 streams beat the static configuration, while the median result finished roughly 1,318 behind it.

That robustness audit changed the conclusion of the project. The dynamic system was technically successful, but the evidence did not support continued model development.

## Lessons learned

The most important lesson was that **a single promising run is not a result**.

I also learned that:

- a strong static baseline can be harder to beat than a sophisticated adaptive model;
- exploration can create variety without creating value;
- sequential models require strict leakage, checkpoint and replay discipline;
- observation-model design can matter as much as the inference method;
- knowing when to stop is part of doing research well.

## Limitations

The system always selected a configuration because it had no explicit no-trade option. The observation models were constructed approximations rather than literal generative descriptions of PnL, and the dense Gaussian posterior would eventually become difficult to scale.

The historical results are research evidence only and should not be interpreted as trading performance or financial advice.
