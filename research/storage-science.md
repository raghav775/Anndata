# Onion storage science (used to calibrate the simulated IoT thresholds)

## Temperature and humidity

For naturally ventilated onion storage (the common structure in the region — not mechanically cooled cold storage), the recommended range is:

- **Temperature: 25–30°C**
- **Relative humidity: 65–70%**

A lower-temperature alternative (~15°C, 50–70% RH) is described for reducing rot/desiccation over medium-term storage, but requires mechanical cooling, which is not the default assumption for a village-level collection-centre storage facility in this pilot.

## Structure

The **NHRDF (National Horticultural Research & Development Foundation)** promotes a ventilated storage structure design (the "onion chawl") providing aeration without active temperature/humidity control. Traditional chawl construction stacking onions 1.5–2.0m high with no bottom aeration causes significant bruising/rotting; adding bottom + central ventilation and raising the floor ~0.6m above ground substantially reduces losses (one study cites a reduction from 99.2% to 70.0% loss over five months — still a large loss rate, underscoring why storage coordination and monitoring genuinely matters for this crop).

## Applied in AnnData

`Commodity.storage_guidelines` for onion in the seed data is set directly from this range:

```json
{
  "ideal_temp_c": [25, 30],
  "warning_temp_c": [20, 33],
  "ideal_humidity_pct": [65, 70],
  "warning_humidity_pct": [55, 75]
}
```

`app/services/iot_simulator.py`'s default thresholds already matched this band by design intent; this research confirms the numbers are realistic rather than arbitrary, and documents *why* onion storage guidance is a naturally-ventilated dry-storage band rather than a refrigerated cold-chain range — the platform explicitly avoids assuming a universal cold-chain model (see `ARCHITECTURE.md` and the storage facility model's `ventilation_type` field).

## Sources

- [Design and development of an adequate ventilation system to preserve freshly harvested onions — ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S2214785322059089)
- [Modern NHRDF onion storage structure under sub-tropical conditions — Vegetable Science](https://isvsvegsci.in/index.php/vegetable/article/view/50)
- [Storage and Handling — National Onion Association](https://www.onions-usa.org/all-about-onions/storage-and-handling/)
- [NHRDF Agro-Techniques](http://www.nhrdf.org/pAgroTechniques_o.php)
