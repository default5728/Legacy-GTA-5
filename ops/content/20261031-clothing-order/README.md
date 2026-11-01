# Stable clothing collection order

The old catalog assumes `clothes` before `clothes2`, then `clotches3` and `clothes4`. These four archives previously used the same order 999. Native texture signatures on Legacy and Enhanced confirmed the runtime instead put `clothes2` first: male pants 235–236, clothes pants 237–256. The Skeleton Jeans texture is clothes local drawable 2, so the catalog ID 237 referenced white cross-pattern jeans (clothes local 0).

Explicit priorities: clothes 991, clothes2 992, clotches3 993, clothes4 994. Expected canonical pants starts: clothes 235, clothes2 255, clothes4 257. Expected male tops starts: clothes 629, clothes2 663, clothes4 677. No constant offsets are applied in gameplay code.

`patch.json` changes only the raw-deflate setup2.xml stream at the verified offset in each original RPF. Archive table, names, model payloads and texture payloads are byte-for-byte preserved. The clothes4 XML additionally removes formatting whitespace to fit the original compressed allocation. Every patched archive was read back using rage.exe and the setup2 XML compared against the intended XML.

The installer verifies original and resulting full SHA256, prepares independent files (never modifies shared hard links in place), stops the game service, preserves the original archives under its before directory, swaps prepared files and restarts. Installed manually at /srv/ragemp-updates/clothing-stable-order-20261031. The large RPF assets are intentionally outside Git/autodeploy.

Native validation after a full GTA/RAGE MP restart is required. This change does not enable the disabled new clothing pack legacy26.
