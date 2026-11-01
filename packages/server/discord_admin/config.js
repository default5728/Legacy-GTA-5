const fs = require('fs');
const path = require('path');

let jsonCfg = null;
try {
    const cfgPath = path.join(__dirname, 'config.json');
    if (fs.existsSync(cfgPath)) {
        jsonCfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    }
} catch (e) { /* ignore */ }

const cfg = jsonCfg || {};

const config = {
    token: cfg.token || '',
    googleSheetId: cfg.googleSheetId || '',
    guildId: cfg.guildId || '',
    sheetDaily: cfg.sheetDaily || 'Ежедневная отчетность',
    sheetWeekly: cfg.sheetWeekly || 'Недельная отчётность',
    sheetCalls: cfg.sheetCalls || 'Обзвоны',
    sheetStaff: cfg.sheetStaff || 'Состав Администрации',
    channelId: cfg.channelId || '',
    logChannelId: cfg.logChannelId || '',
    requestChannelId: cfg.requestChannelId || '',
    updateChannelId: cfg.updateChannelId || '1534361414691454986',
    scanChannels: (cfg.scanChannels || []).map(String).filter(Boolean),
    gameLogChannelId: cfg.gameLogChannelId || cfg.logChannelId || '',
    dbHost: (cfg.db && cfg.db.host) || '',
    dbPort: parseInt((cfg.db && cfg.db.port) || '3306'),
    dbUser: (cfg.db && cfg.db.user) || '',
    dbPassword: (cfg.db && cfg.db.password) || '',
    dbName: (cfg.db && cfg.db.database) || 'flowdm',
    gameApiUrl: (cfg.gameApi && cfg.gameApi.url) || '',
    gameApiSecret: (cfg.gameApi && cfg.gameApi.secret) || '',
    creatorRoleIds: String(cfg.creatorId || '').split(',').filter(Boolean),
    creatorId: String(cfg.creatorId || ''),
    muteRoleId: cfg.muteRoleId || '1532464929792069653',
    headModRoleId: cfg.headModRoleId || '1532464984318017636',
    modRoleId: cfg.modRoleId || '1532464971034656879',
    seniorAdminRoleId: cfg.seniorAdminRoleId || '1532464987484983356',
    backupAllowedRoleId: cfg.backupAllowedRoleId || '1532465028228448429',
    autoRoleId: cfg.autoRoleId || '1532464933361684702',
    prAssistantRoleId: cfg.prAssistantRoleId || '1532464974432305173',
    mediaCuratorRoleId: cfg.mediaCuratorRoleId || '1532464981105442976',
    gaRoleId: cfg.gaRoleId || '1532465001254748170',
    zgaRoleId: cfg.zgaRoleId || '1532464997924606093',
    headPrRoleId: cfg.headPrRoleId || '1532465004480172253',
    curatorRoleId: cfg.curatorRoleId || '1532464990651547662',
    rukRoleId: cfg.rukRoleId || '1532465021244932147',
    automodExemptRoles: (() => {
        const jsonRoles = cfg.automodExemptRoles ? cfg.automodExemptRoles.map(String) : [];
        const mediaRole = cfg.mediaCuratorRoleId || '1532464981105442976';
        const creatorIds = String(cfg.creatorId || '').split(',').filter(Boolean).map(String);
        const all = new Set([...jsonRoles, mediaRole, ...creatorIds]);
        return [...all];
    })(),
    mediaRequestChannelId: cfg.mediaRequestChannelId || '1534361414691454986',
    achievementChannelId: cfg.achievementChannelId || '1534361651111788674',
    achievementReviewChannelId: cfg.achievementReviewChannelId || '1534361694971887827',
    achievementPointsChannelId: cfg.achievementPointsChannelId || '1534361656086364350',
    vacationChannelId: cfg.vacationChannelId || '1534361701028200642',
    vacationReviewChannelId: cfg.vacationReviewChannelId || '1534361667054338119',
    requestCategoryId: cfg.requestCategoryId || '1534361046515585065',
    helperChannelId: cfg.helperChannelId || '1534361466575257639',
    mediaChannelId: cfg.mediaChannelId || '1534361461961527438',
    mediaRequestsChannelId: cfg.mediaRequestsChannelId || '1534361629020651632',
    leaderChannelId: cfg.leaderChannelId || '1534361456894673046',
    tehChannelId: cfg.tehChannelId || '1534361661589291098',
};

module.exports = { config };
