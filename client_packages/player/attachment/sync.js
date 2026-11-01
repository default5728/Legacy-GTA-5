/**
 * Клиентский менеджер вложений (объекты на костях). События addLocal/removeLocal — для других скриптов.
 * Смещение по верхней одежде (компонент 11), чтобы модели не «утопали» в куртках и на кобуре.
 */
function getWeaponAttachNudgeForTop(drawable11, boneIndex) {
    if (drawable11 === undefined || drawable11 === null || drawable11 < 0) {
        return new mp.Vector3(0, 0, 0);
    }
    const d = drawable11;
    let z = 0;
    let y = 0;
    let x = 0;
    if (d >= 40 && d <= 520) {
        z += 0.028;
        y -= 0.022;
    }
    if (d >= 0 && d < 35) {
        z += 0.012;
    }
    const bi = boneIndex | 0;
    if (bi === 24818) {
        z += 0.022;
        y -= 0.018;
    } else if (bi === 51826) {
        z += 0.02;
        y -= 0.012;
        x += 0.008;
    }
    return new mp.Vector3(x, y, z);
}

mp.attachmentMngr = {
    attachments: {},

    addFor(entity, id) {
        if (!this.attachments.hasOwnProperty(id)) return;
        if (entity.__attachmentObjects && entity.__attachmentObjects.hasOwnProperty(id)) return;

        const attInfo = this.attachments[id];
        const mh = attInfo.model;
        try {
            if (!mp.game.streaming.isModelInCdimage(mh)) {
                mp.game.streaming.requestModel(mh);
            }
        } catch (_e) {}
        const object = mp.objects.new(mh, entity.position, { dimension: -1 });

        let offset = attInfo.offset;
        try {
            if (entity.getDrawableVariation && typeof entity.getDrawableVariation === 'function') {
                const topDrawable = entity.getDrawableVariation(11);
                const boneKey = typeof attInfo.boneName === 'string' ? -1 : (attInfo.boneName | 0);
                const nudge = getWeaponAttachNudgeForTop(topDrawable, boneKey);
                offset = new mp.Vector3(
                    attInfo.offset.x + nudge.x,
                    attInfo.offset.y + nudge.y,
                    attInfo.offset.z + nudge.z
                );
            }
        } catch (e) {
            offset = attInfo.offset;
        }

        object.__attMgrData = {
            targetEntity: entity.handle,
            bone: typeof attInfo.boneName === 'string'
                ? entity.getBoneIndexByName(attInfo.boneName)
                : entity.getBoneIndex(attInfo.boneName),
            offset,
            rotation: attInfo.rotation
        };

        try {
            object.notifyStreaming = true;
            entity.__attachmentObjects[id] = object;
        } catch (err) {
            object.destroy();
        }
    },

    removeFor(entity, id) {
        if (!entity.hasOwnProperty('__attachmentObjects')) {
            entity.__attachmentObjects = {};
        }
        if (!entity.__attachmentObjects.hasOwnProperty(id)) return;
        const obj = entity.__attachmentObjects[id];
        delete entity.__attachmentObjects[id];
        if (mp.objects.exists(obj)) obj.destroy();
    },

    initFor(entity) {
        if (!entity.__attachments) return;
        for (const attachment of entity.__attachments) {
            mp.attachmentMngr.addFor(entity, attachment);
        }
    },

    shutdownFor(entity) {
        if (!entity.__attachmentObjects) return;
        for (const attachment in entity.__attachmentObjects) {
            mp.attachmentMngr.removeFor(entity, attachment);
        }
    },

    register(id, model, boneName, offset, rotation) {
        if (typeof id === 'string') id = mp.game.joaat(id);

        let modelHash = model;
        if (typeof model === 'string') {
            modelHash = mp.game.joaat(model.toLowerCase());
            if (!mp.game.streaming.isModelInCdimage(modelHash)) {
                modelHash = mp.game.joaat(model);
            }
        }

        if (offset && typeof offset.x === 'number') {
            offset = new mp.Vector3(offset.x, offset.y, offset.z);
        }
        if (rotation && typeof rotation.x === 'number') {
            rotation = new mp.Vector3(rotation.x, rotation.y, rotation.z);
        }

        if (this.attachments.hasOwnProperty(id)) return;
        if (!modelHash || modelHash === 0) return;

        /* Раньше слот не регистрировался, если isModelInCdimage = false (DLC/поздняя подгрузка) — тогда не было кобуры/спины. */
        if (!mp.game.streaming.isModelInCdimage(modelHash)) {
            try {
                mp.game.streaming.requestModel(modelHash);
            } catch (_e) {}
        }

        this.attachments[id] = {
            id,
            model: modelHash,
            offset,
            rotation,
            boneName
        };
    },

    changerot(name, rot) {
        const id = mp.game.joaat(name);
        if (!this.attachments.hasOwnProperty(id)) return;
        this.attachments[id].rotation = rot;
        this.removeLocal(name);
        this.addLocal(name);
    },

    unregister(id) {
        if (typeof id === 'string') id = mp.game.joaat(id);
        if (this.attachments.hasOwnProperty(id)) {
            this.attachments[id] = undefined;
        }
    },

    addLocal(attachmentName) {
        if (typeof attachmentName === 'string') attachmentName = mp.game.joaat(attachmentName);
        if (!this.attachments.hasOwnProperty(attachmentName)) return;

        const entity = mp.players.local;
        if (entity.__attachments && entity.__attachments.indexOf(attachmentName) !== -1) return;

        mp.events.callRemote('staticAttachments.Add', attachmentName.toString(36));
    },

    removeLocal(attachmentName) {
        if (typeof attachmentName === 'string') attachmentName = mp.game.joaat(attachmentName);
        const entity = mp.players.local;
        if (!entity.__attachments || entity.__attachments.indexOf(attachmentName) === -1) return;
        mp.events.callRemote('staticAttachments.Remove', attachmentName.toString(36));
    },

    getAttachments() {
        return Object.assign({}, this.attachments);
    }
};

mp.events.add({
    addLocal: (attachmentId) => {
        mp.attachmentMngr.addLocal(attachmentId);
    },
    removeLocal: (attachmentId) => {
        mp.attachmentMngr.removeLocal(attachmentId);
    },
    unregister: (name) => {
        mp.attachmentMngr.unregister(name);
    },
    register: (name, pos, rot) => {
        mp.attachmentMngr.register(name, name, 18905, pos, rot);
    },
    changerot: (name, rot) => {
        mp.attachmentMngr.changerot(name, rot);
    }
});

mp.events.add('entityStreamIn', (entity) => {
    if (entity.__attMgrData) {
        const { targetEntity, bone, offset, rotation } = entity.__attMgrData;
        entity.attachTo(
            targetEntity, bone,
            offset.x, offset.y, offset.z,
            rotation.x, rotation.y, rotation.z,
            false, false, false, false, 2, true
        );
    }
    if (entity.__attachments) {
        mp.attachmentMngr.initFor(entity);
    }
});

mp.events.add('entityStreamOut', (entity) => {
    if (entity.__attachmentObjects) {
        mp.attachmentMngr.shutdownFor(entity);
    }
});

mp.events.addDataHandler('attachmentsData', (entity, data) => {
    try {
        const newAttachments = data && data.length > 0
            ? data.split('|').map((att) => parseInt(att, 36))
            : [];

        if (entity.handle === 0) return;

        let oldAttachments = entity.__attachments;
        if (!oldAttachments) {
            oldAttachments = [];
            entity.__attachmentObjects = {};
        }

        for (const attachment of oldAttachments) {
            if (newAttachments.indexOf(attachment) === -1) {
                mp.attachmentMngr.removeFor(entity, attachment);
            }
        }
        for (const attachment of newAttachments) {
            if (oldAttachments.indexOf(attachment) === -1) {
                mp.attachmentMngr.addFor(entity, attachment);
            }
        }
        entity.__attachments = newAttachments;
    } catch (e) {
        /* ignore */
    }
});

(function initAttachmentsForExistingPlayers() {
    try {
        mp.players.forEach((_player) => {
            const data = _player.getVariable('attachmentsData');
            if (data && data.length > 0) {
                _player.__attachments = data.split('|').map((att) => parseInt(att, 36));
                _player.__attachmentObjects = {};
            }
        });
    } catch (e) {
        /* ignore */
    }
})();
