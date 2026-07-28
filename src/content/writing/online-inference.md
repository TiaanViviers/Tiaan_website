---
title: What online inference forces you to confront
description: Notes on latency, memory, and model honesty when estimates must update with every observation.
publishedAt: 2026-06-12
tags:
  - Machine Learning
  - Inference
  - Research
featured: true
---

Offline analysis can afford patience. Online inference cannot.

When a system must revise its beliefs with every new observation, three pressures appear immediately: **latency**, **memory**, and **model honesty**.

Latency is obvious. If an estimate arrives after the decision window closes, it is decorative. Memory is subtler. Many elegant recursions want to keep more history than a long-running process can justify. Model honesty is the quiet one. Online systems punish vague assumptions quickly because there is nowhere to hide the mismatch.

I keep returning to methods that make those pressures explicit—run-length posteriors, particle filters, mixture beliefs—because they turn engineering constraints into part of the statistical story rather than an afterthought.
