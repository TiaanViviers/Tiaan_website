---
title: Cross-Broker CFD Arbitrage System
summary: A demo-only, multi-process trading system that monitored price differences across MetaTrader 5 brokers and explored the execution, reconciliation, and risk problems behind two-leg arbitrage.
year: 2025
category: Trading Systems Engineering
featured: true
order: 5
technologies:
  - Python
  - MetaTrader 5
  - Multiprocessing
  - Systems Engineering
links:
  repository: https://github.com/TiaanViviers/CFD_Arbitrage
---

## Overview

This project began as an experiment in cross-broker CFD arbitrage.

Different retail brokers occasionally quoted slightly different bid and ask prices for the same underlying instrument. The basic idea was simple: detect when one broker was quoting sufficiently lower than another, open opposing positions across both, and close the pair once the divergence had mean-reverted.

The project was built and tested exclusively with MetaTrader 5 demo accounts. It was never intended for real-money trading. Its value was as an engineering exercise: understanding what happens when a clean arbitrage idea meets imperfect APIs, asynchronous execution, incompatible broker conventions and live state that can drift away from what the program believes.

## The real problem

Finding a price difference was the easy part.

The harder problem was executing two connected trades across independent brokers without accidentally becoming exposed to the market. There was no atomic transaction spanning both terminals. One order could succeed while the other failed, a response could arrive late, or a broker could report state differently from the process’s local memory.

The system therefore had to answer questions such as:

- How should multiple MT5 terminals be queried concurrently?
- What happens when only one leg opens?
- How can position sizes remain economically comparable across brokers?
- Which source of truth wins when internal state and broker state disagree?
- How should stale or out-of-order responses be handled?
- How can the system fail safely rather than merely fail quickly?

## Architecture

MetaTrader 5 effectively constrained each Python process to one terminal connection, so the architecture followed a master–worker model.

Each broker ran inside its own worker process. Workers handled broker-specific operations such as obtaining ticks, opening and closing positions, and reporting profit or live positions. A central master process built the cross-broker price matrix and owned the arbitrage state machine.

The main loop was responsible for:

- checking market schedules and event-risk restrictions;
- collecting current quotes and account constraints;
- identifying eligible price divergences;
- sizing economically matched positions;
- submitting both legs;
- rolling back an orphaned leg if its counterpart failed;
- monitoring combined position profit;
- reconciling internal trades with broker-reported positions;
- retrying failed closes and cleaning up untracked positions.

## Safety and state management

The central invariant was that the system should never intentionally retain an unmatched leg after a failed pair opening.

Both positions shared an arbitrage identifier stored as the MT5 magic number. This allowed the system to associate positions across otherwise independent brokers and continuously compare its in-memory state with the positions that actually existed.

When one leg failed to open, the successfully opened position was closed immediately. When a broker-side position disappeared unexpectedly, the remaining leg entered a pending-close state and was retried on subsequent iterations.

This reconciliation logic became more important than the original signal. A divergence detector can be written in a few lines; recovering safely from partial execution requires an explicit state machine.

## Risk and broker normalisation

A nominal “one lot” position does not necessarily represent the same economic exposure at two brokers.

The system therefore normalised sizes using each broker’s value per point, minimum volume and volume step. Position size was also constrained by available margin, an asset-level capital allocation, and the possible movement from the current divergence toward a configured maximum divergence.

The objective was not to prove that the trades were risk-free—they were not—but to prevent a simple broker mismatch from silently creating substantially unequal exposure.

## Experiments and changes

Several design choices changed as the project encountered more realistic failure modes.

Opening multiple qualifying pairs in one iteration increased the chance of acting on stale prices, so the system was limited to one new pair per cycle.

A price-gap-based exit did not account cleanly for unequal fills and transaction effects. The final design instead monitored the combined floating profit of both legs and required a buffer before closing.

Initial stop-loss and sizing logic became difficult to compare across brokers with different contract definitions. Value-per-point normalisation provided a clearer common economic unit.

I also experimented with a loss-injection module intended to make simulated trade behaviour less mechanically perfect. It was later removed from the active system because it added risk and complexity without improving the core engineering experiment.

## Outcome

The project developed into a working demo-account runtime spanning several MT5 terminals, with:

- concurrent broker connectivity;
- live cross-broker price comparison;
- risk-capped position sizing;
- paired order execution and orphan rollback;
- combined-P&L exits;
- continuous broker-state reconciliation;
- market-session and FOMC controls;
- Telegram operational notifications;
- shutdown persistence of completed trades.

I do not present the project as evidence of a profitable trading edge. Its durable result was a much better understanding of real-time execution systems and the amount of defensive engineering required around even a simple strategy.

## Limitations

The system remained dependent on retail broker quote quality, fill behaviour and MT5 infrastructure.

It was not exchange-level arbitrage, did not provide atomic execution across brokers, and could not eliminate temporary directional exposure during failures. Strategy thresholds were heuristic rather than supported by a formal backtesting framework.

The implementation was also Windows- and MT5-specific, had limited automated testing, and included configuration and secrets handling that would need substantial hardening before any production use.

Most importantly, all development and testing occurred on demo accounts. The system was never used to trade real money.

## Lessons learned

The strongest lesson was that, in a multi-broker system, state reconciliation is more important than the signal.

I also learned that:

- independent APIs turn one logical trade into a distributed-systems problem;
- economic normalisation must come before strategy sophistication;
- synchronous-looking APIs still require timeouts, typed responses and retry states;
- observability is part of the system rather than an optional extra;
- reducing scope can improve reliability more than adding features;
- the difficult work often lives in failure handling, not in the central algorithm.
