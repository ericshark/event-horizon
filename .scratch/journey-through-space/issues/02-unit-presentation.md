# Consistent unit presentation and preference migration

Status: resolved
Blocked by: none

Read ../spec.md. Own src/units.ts (new), src/instruments.ts, src/audio.ts and new tests/units.spec.ts. Do not edit main/index/styles/controller. Create UnitMode='miles'|'kilometres'; readUnitMode(), writeUnitMode(mode); formatLength(km, mode, digits=0), formatVelocity(kmS, mode, digits=0), speedValue(kmS,mode), speedUnit(mode), formatAcceleration(kmS2,mode), observationFacts(id,mode):[string,string][], detailFacts(id,mode):[string,string][]. All formatting works from authoritative numeric data; no parsing rounded strings. Retain non-dimensional facts/qualifications; simplify sidereal visible value. Support km/miles conversion in all dimensional observation and checkpoint detail facts, including values originally m/s2. Main UI ticket will consume this API. Import journey catalog into units if needed; no reverse import. earthDistance(km,mode='miles') returns {miles:string,distance:string,context:string}, retaining legacy miles alias for existing tests. RollingDigits.update(value,frozen,reduced,now=performance.now(),unitLabel='miles per hour') updates correct accessible unit without breaking older calls. Migrate sound storage from event-horizon.sound to journey-through-space.sound, preserve explicit legacy preference, unavailable storage defaults silent. Main ticket owns motion migration. Use TDD at existing presentation/science seam as specified and send UI agent contract confirmation promptly. Commit, merge latest integration before done.

## Answer

Implemented the agreed unit presentation API, numeric catalog conversion, accessible rolling units, and sound preference migration. Verified red/green behavior with 6 unit-presentation tests, 3 science tests, typecheck and production build. No server retained.
