---
title: Stochastic Volatility Mixture Engine
summary: An ensemble belief engine for online stochastic volatility estimation, combining particle filtering with mixture-of-models inference.
year: 2026
category: Machine Learning System
featured: true
order: 3
image: /images/projects/svmix-cover.png
imagePosition: center 35%
technologies:
  - Python
  - Particle Filters
  - Ensemble Inference
links:
  repository: https://github.com/TiaanViviers/svmix
---

## Overview

Markets and other noisy systems exhibit volatility that changes over time. This project explores an ensemble approach to online state estimation where multiple candidate models compete and collaborate inside a particle-filter belief engine.

## Problem

A single volatility model is often too brittle. Regime shifts, heavy tails, and misspecification can quietly degrade estimates. The goal was to maintain online beliefs across a mixture of models rather than committing to one.

## Constraints

- Estimation must remain online
- Model competition should be explicit and inspectable
- The system should reuse particle-filter primitives rather than inventing a black box

## Role and ownership

I defined the mixture-of-models framing, implemented the ensemble update logic, and evaluated behaviour under synthetic volatility regimes.

## Approach

Each candidate model contributes particles and likelihood evidence. Mixture weights evolve with incoming data, allowing the engine to shift mass toward models that currently explain observations better.

## Architecture

1. Model registry of candidate volatility dynamics
2. Particle propagation per model
3. Likelihood-weighted belief updates
4. Mixture-weight adaptation and state summary reporting

## Experiments and rejected alternatives

A hard model-selection switch reacted too abruptly. Soft mixture weighting preserved continuity while still allowing decisive shifts when evidence accumulated.

## Results

The ensemble adapts more gracefully than a fixed model on synthetic streams with changing volatility structure, at acceptable compute cost for research-scale experiments.

## Limitations

Mixture complexity grows with the model set. Poorly diversified candidates waste compute without improving coverage.

## Lessons learned

Uncertainty about the model class is itself a first-class modelling problem. Encoding that uncertainty online makes systems more honest and often more robust.
