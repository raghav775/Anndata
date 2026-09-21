# Lasalgaon APMC onion pricing

Lasalgaon (Niphad taluka, Nashik) hosts the largest onion market in Asia and is the benchmark price-discovery point for onion trade across India.

## Reference price band (2026)

| Metric | Value |
|---|---|
| Modal (most-traded) price | ₹2,250–2,375 per quintal |
| Minimum price observed | ₹700 per quintal |
| Maximum price observed | ₹2,651 per quintal |

Converting quintal (100kg) to per-kg for the demo's pricing fields:

| Quintal price | Per-kg equivalent |
|---|---|
| ₹700/quintal | ₹7.00/kg (distress/low-quality floor) |
| ₹2,250–2,375/quintal | ₹22.50–23.75/kg (typical modal band) |
| ₹2,651/quintal | ₹26.51/kg (premium/high-quality ceiling) |

## What "modal price" means

Modal price is the most-traded rate on a given day at a mandi (market yard) and is the benchmark farmers and traders reference — not the average, and not the min/max extremes, which reflect the lowest- and highest-quality lots traded that day.

## Applied in the seed data

`backend/scripts/seed.py` generates buyer gross offer prices in the **₹18–29/kg** range depending on grade (A/B/C) and simulated market conditions across different lots, which sits within and slightly above the real modal band — deliberately including some lower-quality/lower-price lots and some premium ones, rather than every lot trading at an identical price, which is what a real mandi looks like day to day.

## Sources

- [Onion Price Today in Lasalgaon(Niphad) APMC Market — mandipulse.com](https://mandipulse.com/mandi/maharashtra-nashik-lasalgaonniphad-apmc/onion)
- [Onion Price at Lasalgaon(Niphad) APMC — acrop.app](https://acrop.app/mandi/maharashtra/nashik/lasalgaon-niphad/onion)
- [Onion Mandi Rate Today in Lasalgaon APMC — hellokisaan.com](https://hellokisaan.com/mandirates/maharashtra/lasalgaon/onion)
- [Maharashtra onion prices up by Rs 300 per quintal at Lasalgaon market — Deccan Herald](https://www.deccanherald.com/business/maharashtra-onion-prices-up-by-rs-300-per-quintal-at-lasalgaon-market-808700.html)
