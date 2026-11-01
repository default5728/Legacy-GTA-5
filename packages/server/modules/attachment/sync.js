/**
 * API вложений на игроке (attachmentsData + staticAttachments.*).
 * Должен загружаться раньше weapon_body.js
 */
function serializeAttachments(attachments) {
    return attachments.map((h) => h.toString(36)).join('|');
}

function addAttachmentHash(entity, attachmentHash, remove) {
    let idx = entity._attachments.indexOf(attachmentHash);
    if (idx === -1) {
        if (!remove) entity._attachments.push(attachmentHash);
    } else if (remove) {
        entity._attachments.splice(idx, 1);
    }
    entity.setVariable('attachmentsData', serializeAttachments(entity._attachments));
}

function addAttachmentWrap(attachmentName, remove) {
    const t = typeof attachmentName;
    if (t === 'number') {
        addAttachmentHash(this, attachmentName, remove);
    } else if (t === 'string') {
        addAttachmentHash(this, mp.joaat(attachmentName), remove);
    }
}

function hasAttachmentWrap(attachmentName) {
    const h = typeof attachmentName === 'string' ? mp.joaat(attachmentName) : attachmentName;
    return this._attachments.indexOf(h) !== -1;
}

mp.events.add('playerJoin', (player) => {
    try {
        if (!mp.players.exists(player)) return;
        player._attachments = [];
        player.addAttachment = addAttachmentWrap;
        player.hasAttachment = hasAttachmentWrap;
    } catch (e) {
        console.log(e);
    }
});

mp.events.add('staticAttachments.Add', (player, hash) => {
    try {
        if (!mp.players.exists(player) || !player.addAttachment) return;
        player.addAttachment(parseInt(hash, 36), false);
    } catch (e) {
        console.log(e);
    }
});

mp.events.add('staticAttachments.Remove', (player, hash) => {
    try {
        if (!mp.players.exists(player) || !player.addAttachment) return;
        player.addAttachment(parseInt(hash, 36), true);
    } catch (e) {
        console.log(e);
    }
});
