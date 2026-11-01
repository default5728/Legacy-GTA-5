let dstatus = 'Авторизируется на flow DM';
let dstatuss = 'discord.gg/flowdm';

mp.events.add('dstatus', (s1, s2) => {
    dstatus = s1;
    dstatuss = s2;
});

mp.events.add('render', () => {
    mp.discord.update(dstatus, dstatuss);
});
