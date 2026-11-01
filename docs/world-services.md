# World services and inventory

## Controls and behavior

- F7: live HUD placement, including location and speedometer. Existing save/reset/cancel behavior remains.
- E: interact with a nearby service NPC while looking toward it. Houses and repair bays use proximity.
- Post office and driving school use native furnished office interiors. E opens their services; H exits after closing the service window.
- Houses use the native Modern 1 apartment in separate dimensions. E exits the apartment. Purchases persist in `legacy_world_houses`, with three houses per account maximum.
- The practical driving exam costs $1,500 and persists the license in `legacy_world_licenses`. Three speeding violations or a ten-minute timeout fail the exam. The route requires actual movement in the assigned school car.
- Personal vehicles can coexist, one instance per owned model. Any occupant keeps a vehicle alive. Ten minutes empty removes it. Calling another model does not remove the previous vehicle.
- Vehicle impacts use native damage outside existing protections; green zones and invincibility still protect players.
- Inventory displays twenty slots per page, preserving all fifty underlying server slot IDs. Context menu, double click, E/R, drag/drop and confirmation events retain existing names.

## Assets and map

122 curated locations: 19 convenience stores, 15 clothing stores, 7 barbers, 8 banks, 6 tattoo shops, a post office, 2 dealerships, a driving school, 4 repair bays, 4 ATMs and 55 houses. Four houses overlapping existing family mansions were excluded. NPCs stream locally within 70 m with a twelve-ped cap. Vacant house blips are public. Purchased houses disappear for other players; the owner receives a white residence marker.

Native furnished GTA interiors and the server's existing dealership, clothing, barber and tattoo CEF scenes are reused. The post office opens the existing MoonVito marketplace. This release does **not** install a new custom MLO/RPF pack or claim a replica of another project's interiors. Dedicated custom post-office/classroom models and physical placement verification remain separate asset work. Native collisions and floor heights must be checked in both GTA editions in game.

Inventory uses the existing rendered equipment/item atlas and detailed native weapon PNGs, including Assault Shotgun and Special Carbine; no image-generation dependency or external image URL is introduced. Unsupported item art retains the existing fallback.

## Sources

Location facts were adapted from the upstream QBCore configurations, with local adjustments; no executable QBCore scripts were installed:

- https://github.com/qbcore-framework/qb-shops/blob/main/config.lua
- https://github.com/qbcore-framework/qb-clothing/blob/main/config.lua
- https://github.com/qbcore-framework/qb-houserobbery/blob/main/config.lua
- https://github.com/qbcore-framework/qb-banking/blob/main/config.lua

Native IPL coordinates and API signatures:

- https://wiki.rage.mp/wiki/Interiors_and_Locations
- https://wiki.rage.mp/wiki/Ped::Ped
- https://wiki.rage.mp/wiki/Checkpoint::Checkpoint

## Validation

`test-world-services.cjs` exercises proximity/session authorization, transactional shopping, insufficient funds, banking, exclusive house ownership and an actual checkpoint sequence for the driving exam using mocked RAGE/SQL boundaries. Fleet, vehicle-impact and driver-only gauge tests cover their respective runtime paths. The gauge hides when changing into a passenger seat. Browser QA covers inventory art loading, paging to slot 49, context-use wiring and viewport bounds from 720p to 4K. These checks do not replace in-game asset/interaction testing.
