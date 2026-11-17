# Journey Through Space: flight verification

The approved controller/science seam was tested with a red departure test (old controller reported zero speed and no translation at 0.1 seconds), then the new schedule. Numerical checks are separate from the real-time browser motion review.

## Authored active durations

| Connection                        | Seconds |
| --------------------------------- | ------: |
| Earth → Moon                      |      16 |
| Moon → Mercury                    |      18 |
| Mercury → Venus                   |      20 |
| Venus → Sun                       |      22 |
| Sun → Mars                        |      24 |
| Mars → Jupiter                    |      26 |
| Jupiter → Saturn                  |      28 |
| Saturn → Uranus                   |      30 |
| Uranus → Neptune                  |      32 |
| Neptune → Voyager 1               |      36 |
| Voyager 1 → Proxima Centauri      |      44 |
| Proxima Centauri → Sagittarius A* |      60 |

Total route playback: **356 seconds** (5 minutes 56 seconds). The explicit descent remains 20 seconds, giving 376 seconds with descent. Reverse uses the same leg duration. Paused time and inspection time do not count.

## Schedule and camera

Scientific progress is the analytic integral of a length-aware exponential ramp, 20% cruise plateau, and symmetric braking. Speed is its exact derivative multiplied by scientific leg length. Acceleration takes 40% of active time and braking takes 40%. The smooth exponential polynomial has zero acceleration at launch, plateau joins and arrival. Its curvature depends on scientific leg length so early numerical speed does not scale into millions of mph on the long legs. Thrust is actual speed divided by that leg’s peak.

Camera distance is illustrative, with a perceptual expansion of the tiny early scientific fractions sampled on the same authoritative active clock. Its normalized time uses a smooth cubic, with no second easing of radial escape. It escapes radially, rounds a safe viewing shell from radius 12 to 20, crosses between the worlds, rounds the arrival shell from radius 20 to 12, and closes radially. This keeps arbitrary inspected poses and reverse approaches clear of globes and Saturn’s rings. Peak begins at 40% time, after radial escape. There is no separate animation timer or independently eased speed counter.

## Timestamped controller samples

Speed is virtual mph, progress is scientific leg fraction, camera XYZ is in illustrative render units. Samples include canonical forward launches and an inspected reverse launch. These values are numerical evidence, not screen-space or real-device frame-pacing measurements.

### Earth → Moon

| Time (s) |       mph |  Leg progress | Relative speed | Camera XYZ                  |
| -------: | --------: | ------------: | -------------: | --------------------------- |
|     0.00 |    0.0000 |       0.00000 |        0.00000 | 0.00000, 0.00000, 4.13922   |
|     0.10 |  0.023635 |   8.44728e-13 |        0.00000 | 0.00000, 0.00000, 4.14534   |
|     1.00 |    25.016 |    5.54043e-9 |        0.00000 | 0.00000, 0.00000, 4.72776   |
|     2.00 |    1336.2 |    4.06799e-7 |        0.00001 | 0.00000, 0.00000, 6.39101   |
|     2.40 |    5362.9 | 0.00000174031 |        0.00003 | 0.00000, 0.00000, 7.32284   |
|     4.00 | 8.0677e+5 |   0.000307401 |        0.00413 | 0.00000, 0.00000, 12.00000  |
|     6.40 | 1.9529e+8 |      0.142626 |        1.00000 | 0.31545, 1.10409, 24.48000  |
|     8.00 | 1.9529e+8 |      0.500000 |        1.00000 | 2.00000, 7.00000, 60.00000  |
|     9.60 | 1.9529e+8 |      0.857374 |        1.00000 | 0.31545, 1.10409, 95.52000  |
|    12.00 | 8.0677e+5 |      0.999693 |        0.00413 | 0.00000, 0.00000, 108.00000 |
|    14.40 |    304.62 |       1.00000 |        0.00000 | 0.00000, 0.00000, 114.39343 |
|    15.90 |  0.023635 |       1.00000 |        0.00000 | 0.00000, 0.00000, 115.85466 |
|    16.00 |    0.0000 |       1.00000 |        0.00000 | 0.00000, 0.00000, 115.86078 |

### Saturn → Uranus

| Time (s) |        mph | Leg progress | Relative speed | Camera XYZ                    |
| -------: | ---------: | -----------: | -------------: | ----------------------------- |
|     0.00 |     0.0000 |      0.00000 |        0.00000 | 0.00000, 0.00000, 831.60000   |
|     0.10 |  0.0096036 |  5.81661e-17 |        0.00000 | 0.00000, 0.00000, 831.59920   |
|     1.00 |     6.2032 |  2.53070e-13 |        0.00000 | 0.00000, 0.00000, 831.52178   |
|     2.00 |     195.75 |  1.14451e-11 |        0.00000 | 0.00000, 0.00000, 831.29422   |
|     4.50 |  1.6558e+5 |   1.25251e-8 |        0.00000 | 0.00000, 0.00000, 830.14200   |
|     7.50 |  1.8476e+8 | 0.0000156747 |        0.00027 | -1.56631, 0.00000, 828.10266  |
|    12.00 | 6.7810e+11 |     0.110984 |        1.00000 | -0.78863, 2.83908, 864.48000  |
|    15.00 | 6.7810e+11 |     0.500000 |        1.00000 | -5.00000, 18.00000, 900.00000 |
|    18.00 | 6.7810e+11 |     0.889016 |        1.00000 | -0.78863, 2.83908, 935.52000  |
|    22.50 |  1.8476e+8 |     0.999984 |        0.00027 | 0.00000, 0.00000, 948.00000   |
|    27.00 |     3442.6 |      1.00000 |        0.00000 | 0.00000, 0.00000, 954.39343   |
|    29.90 |  0.0096036 |      1.00000 |        0.00000 | 0.00000, 0.00000, 955.85903   |
|    30.00 |     0.0000 |      1.00000 |        0.00000 | 0.00000, 0.00000, 955.86078   |

### Proxima Centauri → Sagittarius A*

| Time (s) |        mph | Leg progress | Relative speed | Camera XYZ                     |
| -------: | ---------: | -----------: | -------------: | ------------------------------ |
|     0.00 |     0.0000 |      0.00000 |        0.00000 | 0.00000, 0.00000, 1315.86078   |
|     0.10 |  0.0041206 |  2.35295e-25 |        0.00000 | 0.00000, 0.00000, 1315.86034   |
|     1.00 |     2.0417 |  8.24039e-22 |        0.00000 | 0.00000, 0.00000, 1315.81759   |
|     2.00 |     48.258 |  2.87390e-20 |        0.00000 | 0.00000, 0.00000, 1315.68997   |
|     9.00 |  2.2961e+8 |  2.06154e-13 |        0.00000 | 0.00000, 0.00000, 1312.67716   |
|    15.00 | 2.1616e+13 |   2.08162e-8 |        0.00000 | -1.56631, 0.00000, 1308.10266  |
|    24.00 | 3.9630e+19 |    0.0743905 |        1.00000 | -1.10409, 2.83908, 1344.48000  |
|    30.00 | 3.9630e+19 |     0.500000 |        1.00000 | -7.00000, 18.00000, 1380.00000 |
|    36.00 | 3.9630e+19 |     0.925609 |        1.00000 | -1.10409, 2.83908, 1415.52000  |
|    45.00 | 2.1616e+13 |      1.00000 |        0.00000 | 0.00000, 0.00000, 1428.00000   |
|    54.00 |  5.1809e+5 |      1.00000 |        0.00000 | 0.00000, 0.00000, 1432.06667   |
|    59.90 |  0.0041206 |      1.00000 |        0.00000 | 0.00000, 0.00000, 1432.99972   |
|    60.00 |     0.0000 |      1.00000 |        0.00000 | 0.00000, 0.00000, 1433.00000   |

### Uranus → Saturn (inspected, close zoom)

| Time (s) |        mph | Leg progress | Relative speed | Camera XYZ                    |
| -------: | ---------: | -----------: | -------------: | ----------------------------- |
|     0.00 |     0.0000 |      0.00000 |        0.00000 | -2.04123, 2.59389, 960.26521  |
|     0.10 |  0.0096036 |  5.81661e-17 |        0.00000 | -2.04242, 2.59540, 960.26537  |
|     1.00 |     6.2032 |  2.53070e-13 |        0.00000 | -2.15761, 2.74178, 960.28033  |
|     2.00 |     195.75 |  1.14451e-11 |        0.00000 | -2.49615, 3.17199, 960.32432  |
|     4.50 |  1.6558e+5 |   1.25251e-8 |        0.00000 | -4.21038, 5.35034, 960.54704  |
|     7.50 |  1.8476e+8 | 0.0000156747 |        0.00027 | -7.42050, 9.42961, 960.13663  |
|    12.00 | 6.7810e+11 |     0.110984 |        1.00000 | -0.78863, 2.83908, 935.52000  |
|    15.00 | 6.7810e+11 |     0.500000 |        1.00000 | -5.00000, 18.00000, 900.00000 |
|    18.00 | 6.7810e+11 |     0.889016 |        1.00000 | -0.78863, 2.83908, 864.48000  |
|    22.50 |  1.8476e+8 |     0.999984 |        0.00027 | -1.56631, 0.00000, 828.10266  |
|    27.00 |     3442.6 |      1.00000 |        0.00000 | 0.00000, 0.00000, 830.92800   |
|    29.90 |  0.0096036 |      1.00000 |        0.00000 | 0.00000, 0.00000, 831.59920   |
|    30.00 |     0.0000 |      1.00000 |        0.00000 | 0.00000, 0.00000, 831.60000   |

## Checks and limits

Controller/full-route checks cover 24 directed connections, multiple frame partitions, exact endpoints, integrated speed within 0.1%, finite/nonnegative telemetry, finite-difference speed agreement, inspection invariance, arbitrary launch poses and ring clearance, pause/resume/skip/duplicate commands, Full default, and observing-only angle-preserving zoom toggle. No browser server or browser process is required for these pure Playwright tests. Real-time visual review remains an integration acceptance step; numerical samples do not establish the subjective feel or hardware rendering performance.
