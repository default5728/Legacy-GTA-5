-- Колонка для JSON прицела (тип point2/cross2 → Phantom HUD JSON).
-- Модуль f10_reticle_server.js создаёт её автоматически при старте сервера.
ALTER TABLE accounts ADD COLUMN crosshair_json MEDIUMTEXT NULL DEFAULT NULL;
