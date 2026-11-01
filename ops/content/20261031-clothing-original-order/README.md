# Restore the remaining original catalogue appearances

This supersedes the collection-order assumption in ../20261031-clothing-order. Putting clothes first restored Skeleton Jeans, but left the old top, accessory and bag IDs assigned to clothes2. The old top 673 was described as a full sweatshirt with a blurred white chest print; the matching texture is clothes4 local top 10, whereas clothes2 local top 10 is the currently incorrect Croatia jersey.

Order: clothes 991, clothes4 992, clotches3 993, clothes2 994. Male top starts: clothes 629, clothes4 663, clothes2 676. Pants starts: clothes 235, clothes4 255, clothes2 263. Glasses starts: clothes 59, clothes4 61, clothes2 63. Bags starts: clothes 111, clothes4 126, clothes2 142. Skeleton Jeans 237 remains unchanged.

Only the compressed setup2.xml streams in clothes2 and clothes4 change. patch.json verifies the previously installed and resulting full archive hashes. The installer makes independent copies, preserves previous archives, restarts the game service, and resumes the deployment timer. No model, texture, catalogue or saved wardrobe IDs are changed. The per-top arm profiles are reordered by collection to follow the same geometry.

The sweatshirt texture supports this collection order; glasses and bag appearance still require in-game confirmation, as does the native layout after a full client restart. New legacy26 clothing remains disabled. Previous backup directory is retained; this revision uses /srv/ragemp-updates/clothing-original-order-20261031.
