---
title: Fast Bayesian Online Changepoint Detection
summary: A high-performance implementation of Bayesian Online Changepoint Detection for streaming time series where regime shifts must be detected as they happen.
year: 2025
category: Statistical Computing
featured: true
order: 1
technologies:
  - Python
  - Bayesian Inference
  - Time Series
links:
  repository: https://github.com/TiaanViviers/Fast_BOCPD
---

## Overview

Streaming systems rarely stay stationary. Means drift, volatility spikes, and latent regimes change without warning. This project focuses on detecting those changepoints online, with latency low enough for practical decision systems.

## Problem

Offline changepoint methods can look back over an entire series. Online settings cannot. The challenge is to maintain a principled posterior over run lengths while updating with every new observation.

## Constraints

- Updates must remain online and incremental
- Memory growth needs to stay controlled for long streams
- The method should remain interpretable for research and applied use

## Role and ownership

I owned the algorithmic implementation, numerical design choices, and evaluation against synthetic regime-shift scenarios.

## Approach

The system maintains a run-length distribution and updates it recursively as observations arrive. Careful pruning and vectorised updates keep the method tractable without abandoning the Bayesian formulation.

## Architecture

1. Observation intake and sufficient-statistic updates
2. Run-length posterior recursion
3. Pruning / truncation for bounded compute
4. Changepoint probability reporting for downstream consumers

## Experiments and rejected alternatives

A naïve full-history recursion was accurate but too expensive for long streams. Aggressive truncation improved speed but degraded sensitivity. The final design balances truncation with retention of high-probability run lengths.

## Results

The implementation recovers planted changepoints on synthetic streams with competitive latency relative to a straightforward baseline, while remaining readable enough to extend.

## Limitations

Performance still depends on model assumptions and pruning thresholds. Misspecified observation models can delay or blur detection.

## Lessons learned

Online Bayesian methods are only useful when numerical discipline matches statistical elegance. Small implementation choices dominate practical behaviour.
