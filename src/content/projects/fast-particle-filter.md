---
title: Fast Particle Filter in C
summary: A carefully engineered particle filter implementation in C, prioritising numerical clarity, speed, and reusable primitives for sequential Monte Carlo.
year: 2025
category: Probabilistic Systems
featured: true
order: 2
image: /images/projects/particle-filter-cover.png
imagePosition: center 40%
technologies:
  - C
  - Sequential Monte Carlo
  - Numerical Computing
links:
  repository: https://github.com/TiaanViviers/fastpf
---

## Overview

Particle filters sit at the intersection of probability and systems engineering. This project builds a fast, readable C implementation intended as a foundation for sequential Monte Carlo experiments.

## Problem

High-level prototyping languages are excellent for exploring algorithms, but they can hide the cost of resampling, weight updates, and state propagation. I wanted a lean implementation where those costs are explicit.

## Constraints

- Prefer clarity over framework abstraction
- Keep allocations predictable
- Support reusable building blocks for later ensemble models

## Role and ownership

I designed and implemented the core filter loop, resampling strategy, and supporting utilities.

## Approach

The filter follows a classic predict–update–resample cycle. Emphasis was placed on contiguous state storage, simple interfaces, and transparent weight handling so the algorithm remains inspectable under profiling.

## Architecture

- Particle state buffers
- Transition and observation model hooks
- Weight update and normalisation
- Resampling pass with configurable strategy

## Experiments and rejected alternatives

Early prototypes mixed too much allocation into the hot path. Moving toward preallocated buffers and tighter loops improved both predictability and speed.

## Results

The resulting library is compact enough to reason about line-by-line, and fast enough to serve as a substrate for more specialised inference engines.

## Limitations

Domain models still need careful specification. A fast filter cannot compensate for a poorly chosen process or observation model.

## Lessons learned

Performance work in probabilistic algorithms is mostly about making the algorithm's structure obvious to both the machine and the reader.
