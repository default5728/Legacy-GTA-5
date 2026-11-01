let charBrowser = null;

let charCamera = null;
let spawnOptions = null, requestedSpawnCharacter = null;
let keplerCharacterVisible = false;
mp.events.add('client:charselect:show', () => { keplerCharacterVisible = true; });
mp.events.add('client:charselect:spawned', () => { keplerCharacterVisible = false; });
mp.events.add('render', () => {
    if (!keplerCharacterVisible || !charBrowser) return;
    if (!charBrowser.active) charBrowser.active = true;
    mp.gui.cursor.show(true, true);
    for (const key of [1,2,24,25,30,31,37,199,200]) mp.game.controls.disableControlAction(0,key,true);
});



const PODIUM_POS = new mp.Vector3(-813.8, 178.6, 76.74);

const CAM_BODY_POS = new mp.Vector3(-813.8, 176.0, 77.1);

const CAM_FACE_POS = new mp.Vector3(-813.8, 177.6, 77.3);



// ======================== ОТКРЫТИЕ СЕЛЕКТОРА ПЕРСОНАЖЕЙ ========================

mp.events.add('client:charselect:open', (charsJson, prefFirstName, prefLastName) => {
    mp.events.call('client:charselect:show');

    try {

        prepareCharacterScene();

    } catch (e) {

        console.error('[CHAR SCENE ERROR]', e);

    }



    if (!charBrowser) {

        charBrowser = mp.browsers.new('package://character/index.html');
        charBrowser.orderId = 950;

    }



    mp.gui.cursor.show(true, true);

    mp.game.ui.displayRadar(false);

    mp.gui.chat.show(false);



    charBrowser.active = true;
    let chars;
    try { chars = JSON.parse(charsJson || '[]'); } catch (_) { chars = []; }
    if (!Array.isArray(chars)) chars = [];
    const data = JSON.stringify(chars.slice(0, 3));
    const code = 'window.CHAR_UI.setCharacters(' + data + ',' + JSON.stringify(String(prefFirstName || '')) + ',' + JSON.stringify(String(prefLastName || '')) + ');try{if(mp.invoke)mp.invoke("focus",true);}catch(_){}';
    global.browserExecWhen(charBrowser, 'window.CHAR_UI && typeof window.CHAR_UI.setCharacters === "function"', code);

});



function setPedPoseAndHeading(headingDeg) {

    const local = mp.players.local;

    if (!local) return;

    try {

        local.freezePosition(false);

        local.position = PODIUM_POS;

        local.setHeading(headingDeg);

        local.heading = headingDeg;

        local.clearTasksImmediately();

        local.taskStandStill(-1);

        local.freezePosition(true);

    } catch (e) {}

}



function prepareCharacterScene() {

    setPedPoseAndHeading(180.0);



    // Безопасное обновление интерьера без устаревших / несуществующих методов

    try {

        if (mp.game.interior && typeof mp.game.interior.refreshInterior === 'function') {

            const interior = mp.game.interior.getInteriorAtCoords(PODIUM_POS.x, PODIUM_POS.y, PODIUM_POS.z);

            if (interior) {

                mp.game.interior.refreshInterior(interior);

            }

        }

    } catch (e) {}



    // Создаем фиксированную камеру

    if (!charCamera) {

        charCamera = mp.cameras.new('default', CAM_BODY_POS, new mp.Vector3(0, 0, 0), 45);

        charCamera.pointAtCoord(PODIUM_POS.x, PODIUM_POS.y, PODIUM_POS.z + 0.2);

        charCamera.setActive(true);

        mp.game.cam.renderScriptCams(true, false, 0, true, false);

    }

}



// ======================== СОБЫТИЯ ВЫБОРА ========================

mp.events.add('client:charselect:preview', (charId) => {

    mp.events.callRemote('server:charselect:getPreviewData', charId);

});



mp.events.add('client:charselect:applyPreview', (modelHash, customDataJson) => {

    applyCharacterAppearance(modelHash, customDataJson);

});



mp.events.add('client:charselect:delete', (charId) => {
    mp.events.callRemote('server:charselect:deleteCharacter', charId);
});

mp.events.add('client:charselect:refresh', (charsJson) => {
    if (charBrowser) {
        charBrowser.execute(`if (window.CHAR_UI && window.CHAR_UI.updateCharacters) window.CHAR_UI.updateCharacters(${charsJson});`);
    }
});

mp.events.add('client:charselect:choose', (charId) => {

    requestedSpawnCharacter=Number(charId);
    mp.events.callRemote('server:spawn:options', charId);

});



mp.events.add('client:charselect:spawned', () => {
    spawnOptions=null;requestedSpawnCharacter=null;
    mp.players.local.setVisible(true,false);

    if (charBrowser) {

        charBrowser.destroy();

        charBrowser = null;

    }



    if (charCamera) {

        charCamera.destroy();

        charCamera = null;

        mp.game.cam.renderScriptCams(false, true, 800, true, false);

    }



    mp.gui.cursor.show(false, false);

    mp.game.ui.displayRadar(true);

    mp.gui.chat.show(false);
    mp.gui.chat.activate(false);

    mp.players.local.freezePosition(false);

    mp.game.cam.doScreenFadeIn(600);

});



// ======================== СОБЫТИЯ КАСТОМИЗАТОРА (CREATOR) ========================

mp.events.add('client:charcreator:open', () => {

    setGenderModel(0);

});



mp.events.add('client:charcreator:gender', (gender) => {

    setGenderModel(gender);

});



function setGenderModel(gender) {

    try {

        const modelHash = gender === 1 ? mp.game.joaat('mp_f_freemode_01') : mp.game.joaat('mp_m_freemode_01');

        if (!mp.game.streaming.hasModelLoaded(modelHash)) {

            mp.game.streaming.requestModel(modelHash);

        }

        const local = mp.players.local;

        local.model = modelHash;

        setPedPoseAndHeading(180.0);



        setTimeout(() => {

            setPedPoseAndHeading(180.0);

        }, 120);

    } catch (e) {

        console.error('[GENDER MODEL ERROR]', e);

    }

}



mp.events.add('client:charcreator:parents', (parentsJson) => {

    try {

        const p = typeof parentsJson === 'string' ? JSON.parse(parentsJson) : parentsJson;

        const p1 = parseInt(p.father !== undefined ? p.father : 0);

        const p2 = parseInt(p.mother !== undefined ? p.mother : 21);

        const sim = parseFloat(p.similarity !== undefined ? p.similarity : 0.5);

        const skinSim = parseFloat(p.skinSimilarity !== undefined ? p.skinSimilarity : 0.5);

        mp.players.local.setHeadBlendData(

            p1,

            p2,

            0,

            p1,

            p2,

            0,

            sim,

            skinSim,

            0.0,

            false

        );

    } catch (e) {

        console.error('[CHARCREATOR PARENTS ERROR]', e);

    }

});



mp.events.add('client:charcreator:feature', (idx, val) => {

    try {

        mp.players.local.setFaceFeature(parseInt(idx), parseFloat(val));

    } catch (e) {}

});



mp.events.add('client:charcreator:hair', (hair, hairColor) => {

    try {

        mp.players.local.setComponentVariation(2, parseInt(hair), 0, 0);

        mp.players.local.setHairColor(parseInt(hairColor), 0);

    } catch (e) {}

});



mp.events.add('client:charcreator:eyeColor', (color) => {

    try {

        mp.players.local.setEyeColor(parseInt(color));

    } catch (e) {}

});



mp.events.add('client:charcreator:beard', (beard) => {

    try {

        const bId = parseInt(beard);

        mp.players.local.setHeadOverlay(1, bId, bId === 0 ? 0.0 : 1.0, 0, 0);

    } catch (e) {}

});



let camDist = 2.4;

let camZOffset = 0.2;

let curPedHeading = 180.0;



function updateCharCamera() {

    if (!charCamera) return;

    try {

        const camX = PODIUM_POS.x;

        const camY = PODIUM_POS.y - camDist;

        const camZ = PODIUM_POS.z + camZOffset + 0.15;

        charCamera.setCoord(camX, camY, camZ);

        charCamera.pointAtCoord(PODIUM_POS.x, PODIUM_POS.y, PODIUM_POS.z + camZOffset);

    } catch (e) {}

}



mp.events.add('client:charcreator:zoom', (delta) => {

    camDist = Math.max(0.7, Math.min(3.2, camDist + delta));

    updateCharCamera();

});



mp.events.add('client:charcreator:pan', (delta) => {

    camZOffset = Math.max(-0.6, Math.min(0.85, camZOffset + delta));

    updateCharCamera();

});



mp.events.add('client:charcreator:rotate', (deg) => {

    curPedHeading = (curPedHeading + deg) % 360;

    if (curPedHeading < 0) curPedHeading += 360;

    setPedPoseAndHeading(curPedHeading);

});



mp.events.add('client:charcreator:resetRotation', () => {

    curPedHeading = 180.0;

    setPedPoseAndHeading(180.0);

});



mp.events.add('client:charcreator:camPreset', (preset) => {

    if (preset === 'face') {

        camDist = 0.95;

        camZOffset = 0.65;

    } else if (preset === 'torso') {

        camDist = 1.6;

        camZOffset = 0.15;

    } else if (preset === 'legs') {

        camDist = 1.9;

        camZOffset = -0.4;

    } else { // body

        camDist = 2.4;

        camZOffset = 0.15;

    }

    updateCharCamera();

});



mp.events.add('client:charcreator:reset', (gender) => {

    const isFemale = gender === 1;

    setGenderModel(gender);

    const local = mp.players.local;

    if (isFemale) {

        local.setHeadBlendData(21, 31, 0, 21, 31, 0, 0.5, 0.5, 0.0, false);

    } else {

        local.setHeadBlendData(0, 21, 0, 0, 21, 0, 0.5, 0.5, 0.0, false);

    }

    for (let i = 0; i < 20; i++) {

        local.setFaceFeature(i, 0.0);

    }

    local.setComponentVariation(2, isFemale ? 1 : 4, 0, 0);

    local.setHairColor(0, 0);

    local.setEyeColor(0);

    local.setHeadOverlay(1, 0, 0.0, 0, 0);

    applyPedClothes(isFemale, { top: 0, topColor: 0, legs: 0, legsColor: 0, shoes: 0, shoesColor: 0 });

    curPedHeading = 180.0;

    camDist = 2.4;

    camZOffset = 0.15;

    updateCharCamera();

});



// ======================== БАЗОВЫЙ ГАРДЕРОБ (CLOTHING) ========================

function applyPedClothes(isFemale,clothes){if(clothes)global.CLOTHING.outfit(isFemale?1:0,clothes);}

mp.events.add('client:charcreator:clothes', (clothesJson) => {

    try {

        const c = typeof clothesJson === 'string' ? JSON.parse(clothesJson) : clothesJson;

        const isFemale = mp.players.local.model === mp.game.joaat('mp_f_freemode_01');

        applyPedClothes(isFemale, c);

    } catch (e) {

        console.error('[CHAR CREATOR CLOTHES ERROR]', e);

    }

});



mp.events.add('client:charcreator:cam', (mode) => {

    if (mode === 'face') {

        camDist = 0.95;

        camZOffset = 0.65;

    } else {

        camDist = 2.4;

        camZOffset = 0.15;

    }

    updateCharCamera();

});



mp.events.add('client:charcreator:submit', (payloadJson) => {

    mp.events.callRemote('server:charcreator:create', payloadJson);

});



mp.events.add('client:charcreator:error', (msg) => {

    if (charBrowser) {

        charBrowser.execute(`if (window.CHAR_UI) window.CHAR_UI.showError("${msg}");`);

    }

});



// Вспомогательная функция применения внешности

function applyCharacterAppearance(modelHash, customDataJson) {

    const local = mp.players.local;

    if (modelHash) {

        local.model = typeof modelHash === 'number' ? modelHash : mp.game.joaat(modelHash);

    }



    if (!customDataJson) return;

    try {

        const c = typeof customDataJson === 'string' ? JSON.parse(customDataJson) : customDataJson;

        if (c.parents) {

            const p1 = parseInt(c.parents.father !== undefined ? c.parents.father : 0);

            const p2 = parseInt(c.parents.mother !== undefined ? c.parents.mother : 21);

            const sim = parseFloat(c.parents.similarity !== undefined ? c.parents.similarity : 0.5);

            const skinSim = parseFloat(c.parents.skinSimilarity !== undefined ? c.parents.skinSimilarity : 0.5);

            local.setHeadBlendData(

                p1,

                p2,

                0,

                p1,

                p2,

                0,

                sim,

                skinSim,

                0.0,

                false

            );

        }

        if (Array.isArray(c.features)) {

            for (let i = 0; i < c.features.length; i++) {

                local.setFaceFeature(i, parseFloat(c.features[i]));

            }

        }

        if (c.hair !== undefined) {

            local.setComponentVariation(2, parseInt(c.hair), 0, 0);

            local.setHairColor(parseInt(c.hair_color || 0), 0);

        }

        if (c.appearance) {

            if (c.appearance.eyeColor !== undefined) local.setEyeColor(parseInt(c.appearance.eyeColor));

            if (c.appearance.beard !== undefined) {

                const b = parseInt(c.appearance.beard);

                local.setHeadOverlay(1, b, b === 0 ? 0.0 : 1.0, 0, 0);

            }

            if (c.appearance.clothes) {

                const isFemale = local.model === mp.game.joaat('mp_f_freemode_01');

                applyPedClothes(isFemale, c.appearance.clothes);

            }

        }

        if (c.clothes) {

            const isFemale = local.model === mp.game.joaat('mp_f_freemode_01');

            applyPedClothes(isFemale, c.clothes);

        }

    } catch (e) {

        console.error('[CHAR APPLY ERROR]', e);

    }

}



exports.applyCharacterAppearance = applyCharacterAppearance;


// The server supplies allowed points; client coordinates are never submitted as spawn authority.
mp.events.add('client:spawn:options',json=>{
 let data;try{data=JSON.parse(json);}catch(_){return;}
 if(!data||data.characterId!==requestedSpawnCharacter||!Array.isArray(data.choices)||!charBrowser)return;
 spawnOptions=data;
 charBrowser.execute('if(window.CHAR_UI&&window.CHAR_UI.showSpawnOptions)window.CHAR_UI.showSpawnOptions('+JSON.stringify(data)+');');
});
mp.events.add('client:spawn:preview',choice=>{
 if(!spawnOptions||!charBrowser)return;
 const selected=spawnOptions.choices.find(c=>c.id===choice);if(!selected)return;
 const p=selected.point,player=mp.players.local;
 player.freezePosition(true);player.setVisible(false,false);player.position=new mp.Vector3(p.x,p.y,p.z);
 mp.game.streaming.requestCollisionAtCoord(p.x,p.y,p.z);
 if(!charCamera)charCamera=mp.cameras.new('default',new mp.Vector3(p.x+12,p.y-16,p.z+11),new mp.Vector3(0,0,0),50);
 charCamera.setCoord(p.x+12,p.y-16,p.z+11);charCamera.pointAtCoord(p.x,p.y,p.z+.5);charCamera.setActive(true);
 mp.game.cam.renderScriptCams(true,false,0,true,false);mp.gui.cursor.show(true,true);
});
mp.events.add('client:spawn:confirm',choice=>{
 if(!spawnOptions||!spawnOptions.choices.some(c=>c.id===choice))return;
 mp.events.callRemote('server:charselect:chooseCharacter',spawnOptions.characterId,choice);
});
mp.events.add('client:spawn:error',message=>{
 if(charBrowser)charBrowser.execute('if(window.CHAR_UI&&window.CHAR_UI.showSpawnError)window.CHAR_UI.showSpawnError('+JSON.stringify(String(message))+');');
});
function restoreCharacterPreview(){
 spawnOptions=null;requestedSpawnCharacter=null;mp.players.local.setVisible(true,false);
 prepareCharacterScene();
 if(charCamera){charCamera.setCoord(CAM_BODY_POS.x,CAM_BODY_POS.y,CAM_BODY_POS.z);charCamera.pointAtCoord(PODIUM_POS.x,PODIUM_POS.y,PODIUM_POS.z+.2);}
}
mp.events.add('client:spawn:cancel',restoreCharacterPreview);
mp.events.add('client:charselect:restore',restoreCharacterPreview);
