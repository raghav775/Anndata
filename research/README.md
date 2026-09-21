# Research: Niphad–Lasalgaon onion market reference data

This folder documents real, publicly available reference facts used to make the **synthetic** demo dataset (`backend/scripts/seed.py`) realistic — realistic price ranges, real village/taluka names, real onion varieties, real storage science, real market structure. **None of the specific farmers, FPOs, buyers, transporters or transactions in the seed data are real** — only the surrounding facts (place names, price bands, variety names, agronomic guidance) are drawn from public sources, cited below.

## Files

- [`onion-market-pricing.md`](onion-market-pricing.md) — Lasalgaon APMC price bands, what modal/min/max price means
- [`geography-and-villages.md`](geography-and-villages.md) — real Niphad taluka villages and neighboring onion-growing talukas
- [`varieties-and-grading.md`](varieties-and-grading.md) — real onion varieties grown in the region, and India's AGMARK grading framework
- [`storage-science.md`](storage-science.md) — real temperature/humidity/ventilation guidance for onion storage, used to calibrate the simulated IoT thresholds

## How this was gathered

Web search conducted during development (September 2026) against public agricultural-market and government sources (commodityonline.com, kisandeals.com, mandipulse.com mandi-price aggregators; Wikipedia; NHRDF; ICAR-DOGR; nashik.gov.in; sfacindia.com). Each file cites its sources. This is standard public market-price and agronomic reference information, not personal or confidential data.

## Why this matters for the demo

A judge or evaluator who knows the region will notice if "Niphad" farmers are selling onions at ₹5/kg (unrealistically low) or if a fictional village doesn't exist. Grounding the *ranges and names* in reality — while keeping every specific person, organization and transaction clearly synthetic — makes the demo credible without claiming any of it is real data about real people.
