"""Simulated IoT storage sensor stream.

There is no physical hardware. Readings are generated locally and are
explicitly a demonstration aid — they do not certify shelf life or food
safety. Thresholds come from the commodity's `storage_guidelines` (data, not
a hardcoded universal cold-chain assumption), falling back to a reasonable
default for a dry-storage commodity like onion.
"""

import random
from dataclasses import dataclass

from app.models.enums import SensorStatus

DEFAULT_GUIDELINES = {
    "ideal_temp_c": [25, 30],
    "warning_temp_c": [20, 33],
    "ideal_humidity_pct": [65, 70],
    "warning_humidity_pct": [55, 75],
}


def classify_status(
    temperature_c: float, humidity_pct: float, guidelines: dict | None = None
) -> SensorStatus:
    g = guidelines or DEFAULT_GUIDELINES
    ideal_t_lo, ideal_t_hi = g["ideal_temp_c"]
    warn_t_lo, warn_t_hi = g["warning_temp_c"]
    ideal_h_lo, ideal_h_hi = g["ideal_humidity_pct"]
    warn_h_lo, warn_h_hi = g["warning_humidity_pct"]

    if temperature_c < warn_t_lo or temperature_c > warn_t_hi:
        return SensorStatus.ALERT
    if humidity_pct < warn_h_lo or humidity_pct > warn_h_hi:
        return SensorStatus.ALERT
    if not (ideal_t_lo <= temperature_c <= ideal_t_hi) or not (
        ideal_h_lo <= humidity_pct <= ideal_h_hi
    ):
        return SensorStatus.WARNING
    return SensorStatus.NORMAL


@dataclass
class SimulatedReading:
    temperature_celsius: float
    humidity_percent: float
    occupancy_percent: float
    status: SensorStatus


def generate_reading(
    guidelines: dict | None = None, occupancy_baseline: float = 60.0
) -> SimulatedReading:
    g = guidelines or DEFAULT_GUIDELINES
    ideal_t_lo, ideal_t_hi = g["ideal_temp_c"]
    ideal_h_lo, ideal_h_hi = g["ideal_humidity_pct"]

    roll = random.random()
    if roll < 0.75:
        temp = round(random.uniform(ideal_t_lo, ideal_t_hi), 1)
        humidity = round(random.uniform(ideal_h_lo, ideal_h_hi), 1)
    elif roll < 0.93:
        temp = round(random.uniform(ideal_t_hi, ideal_t_hi + 4), 1)
        humidity = round(random.uniform(ideal_h_hi, ideal_h_hi + 8), 1)
    else:
        temp = round(random.uniform(ideal_t_hi + 4, ideal_t_hi + 8), 1)
        humidity = round(random.uniform(ideal_h_hi + 8, ideal_h_hi + 15), 1)

    occupancy = round(
        max(0.0, min(100.0, occupancy_baseline + random.uniform(-3, 3))), 1
    )
    status = classify_status(temp, humidity, g)
    return SimulatedReading(temp, humidity, occupancy, status)
