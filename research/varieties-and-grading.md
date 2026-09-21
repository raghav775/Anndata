# Onion varieties and grading

## Varieties actually grown in the Nashik/Niphad cluster

- **Nashik Red (N-53)** — the region's signature variety
- **Lasalgaon onion / "Niphad Red"** — holds GI (Geographical Indication) status; light red colour, larger bulbs, strong pungent flavour
- **Agrifound Dark Red**, **Agrifound Rose**, **Agrifound Light Red** — ICAR-DOGR released varieties recommended for Maharashtra
- **Bhima Super** — red onion variety, ~20–22 t/ha (kharif), ~40–45 t/ha (late kharif) average yield
- **Bhima Red**, **Bhima Raj** — also recommended for Maharashtra/Karnataka/Gujarat
- **Baswant-780** — recommended for kharif/late kharif in Maharashtra

## Applied in the seed data

`Commodity.variety` and each `Lot.variety` in the extended seed draw from this real list (`Nashik Red N-53`, `Lasalgaon Red (GI)`, `Bhima Super`, `Agrifound Dark Red`) instead of a single repeated placeholder string, so different lots plausibly differ the way a real collection centre's intake would.

## AGMARK grading (India)

The Agricultural Produce (Grading & Marking) Act, 1937 ("AGMARK") establishes a standard grading hierarchy — **Special Grade → Standard Grade → General Grade** — based on physical characteristics (size, shape, colour, appearance), moisture content, and freedom from blemishes, disease or contamination. Onions and grapes are specifically called out as significant AGMARK export commodities from this region.

AnnData's own `Grade` enum (`A` / `B` / `C` / `REJECTED`) is a simplified three-tier analogue of this real Special/Standard/General hierarchy, chosen for the MVP's tolerance-band pricing engine rather than implementing the full AGMARK certification process (which requires an accredited grading agency, not just an FPO-appointed assayer) — see `docs/quality-and-rejection.md` for how AnnData's grading differs from and does not claim to be AGMARK certification.

## Sources

- [Onion Rates In Nashik — nashikcity.in](https://nashikcity.in/onion-rates/)
- [Lasalgaon onion — Wikipedia](https://en.wikipedia.org/wiki/Lasalgaon_onion) (GI status, Niphad Red naming)
- [Varieties developed — ICAR-DOGR](https://dogr.icar.gov.in/index.php?option=com_content&view=article&id=80&Itemid=114&lang=en)
- [Onion Varieties — National Horticulture Board](https://nhb.gov.in/pdf/vegetable/onion/oni013.pdf)
- [AGMARK: Ensuring Quality and Grading of Agricultural Products — Food Safety Institute](https://foodsafety.institute/food-laws-standards/agmark-quality-grading-agricultural-products/)
- [AGMARK Standards for Fruits & Vegetables — TNAU](https://agritech.tnau.ac.in/amis/pdf/F_V_G_M_under_Agmark.pdf)
