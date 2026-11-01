# Совместная работа

Репозиторий: https://github.com/talipovtimur347-cpu/legacy-roleplay

## Другу (default5728)

1. Принять приглашение GitHub в этот закрытый репозиторий.
2. Клонировать проект через GitHub Desktop или командой:
   `git clone https://github.com/talipovtimur347-cpu/legacy-roleplay.git`
3. Перед работой получить обновления (Fetch/Pull).
4. После редактирования выполнить Commit и Push. Только сохранения файла в редакторе недостаточно: изменения нужно отправить в GitHub.

## На ПК владельца

Рабочая папка: `D:\LegacyRoleplay`.
Фоновая задача `LegacyRoleplay-GitSync` получает новые коммиты из main раз в минуту и запускается при входе в Windows.
При локальных незакоммиченных правках получение приостанавливается. Ничьи изменения не удаляются.
Журнал: `.git-sync/sync.log`.
Разовое обновление: `./tools/Sync-Project.ps1 -Once`.
Отправка своих правок: `./tools/Save-Changes.ps1 -Message "Описание"` или Commit/Push в GitHub Desktop.
Остановить фоновое обновление: `Stop-ScheduledTask -TaskName LegacyRoleplay-GitSync`.

После Push в main успешная проверка GitHub Actions разрешает автоматическую установку на VPS. При изменениях игрового кода сервер кратко перезапускается. При ошибке запуска возвращаются предыдущие файлы. См. ops/autodeploy/README.md.
DLC, пароли, SSH-ключи и база игроков в репозиторий не включены.