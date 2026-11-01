// Обработчик уведомления для самого игрока
mp.events.addDataHandler('antiAimActive', (entity, value) => {
    if (entity !== mp.players.local) return;
    if (value === true) {
        mp.events.call('notify:client', 3, 'top-mid', 'Антиаим включён — запущен быстрый Jitter (60-110мс).', 5000);
    } else {
        mp.events.call('notify:client', 3, 'top-mid', 'Антиаим выключен.', 3000);
    }
});

// Визуальный джиттер (3 строгие позиции, интервал 60-110 мс, голова строго вниз)
mp.events.add('render', () => {
    const now = Date.now();

    mp.players.forEachInStreamRange((player) => {
        if (player !== mp.players.local && player.getVariable('antiAimActive') === true) {
            
            // 1. Инициализируем индивидуальные переменные, если их еще нет
            if (!player.lastJitterSwitch) {
                player.lastJitterSwitch = now;
                player.nextJitterInterval = 60 + Math.random() * 50; // Интервал от 60 до 110 мс
                player.jitterState = 0;
                player.targetHeading = player.getHeading();
                player.needsHeadingSync = false;
            }

            // 2. Проверяем, пришло ли время сменить фазу джиттера
            if (now - player.lastJitterSwitch > player.nextJitterInterval && !player.needsHeadingSync) {
                // Даем игре ровно 1 кадр, чтобы вернуть реальный сетевой Heading, не перезаписывая его
                player.needsHeadingSync = true;
                return; // Пропускаем этот кадр рендера (персонаж на мгновение вернется в оригинальный угол)
            }

            // 3. В следующем кадре считываем чистый сетевой Heading и задаем новое смещение
            if (player.needsHeadingSync) {
                const realHeading = player.getHeading(); // Чистый, неизмененный угол игрока от сервера
                player.jitterState = (player.jitterState + 1) % 3; // Переходим к следующей фазе (0, 1, 2)

                if (player.jitterState === 0) {
                    // Позиция 1: Ровно влево (-90)
                    player.targetHeading = (realHeading - 90 + 360) % 360;
                } else if (player.jitterState === 1) {
                    // Позиция 2: Ровно назад (180)
                    player.targetHeading = (realHeading + 180) % 360;
                } else if (player.jitterState === 2) {
                    // Позиция 3: Ровно вправо (+90)
                    player.targetHeading = (realHeading + 90) % 360;
                }

                // Сбрасываем флаг синхронизации и обновляем таймер на новые 250-330 мс
                player.needsHeadingSync = false;
                player.lastJitterSwitch = now;
                player.nextJitterInterval = 60 + Math.random() * 50;
            }

            // 4. Жестко удерживаем рассчитанный угол во всех остальных кадрах текущей фазы
            player.setHeading(player.targetHeading);
            player.setRotation(0.0, 0.0, player.targetHeading, 2, true);

            // 5. Фиксируем взгляд строго в самой нижней точке
            const pos = player.position;
            const lookAtZ = pos.z - 5.0; // 5 метров под ногами

            // Направляем шею (1) и позвоночник (2) вниз
            player.setIkTarget(1, 0, -1, pos.x, pos.y, lookAtZ, 0, 100, 100);
            player.setIkTarget(2, 0, -1, pos.x, pos.y, lookAtZ, 0, 100, 100);
        } else {
            // Очищаем переменные при выключении режима или выходе из стрима
            if (player.lastJitterSwitch) {
                delete player.lastJitterSwitch;
                delete player.nextJitterInterval;
                delete player.jitterState;
                delete player.targetHeading;
                delete player.needsHeadingSync;
            }
        }
    });
});