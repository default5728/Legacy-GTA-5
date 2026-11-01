let speedoBrowser = null;
let speedoInterval = null;
let mileageKm = 367.4;
let lastVehPos = null;
let lastPacket=null;

function getSpeedoBrowser() {
    if (!speedoBrowser) {
        speedoBrowser = mp.browsers.new('package://speedometer/index.html');
    }
    return speedoBrowser;
}

function startSpeedometerUpdates(veh) {
    if (speedoInterval) clearInterval(speedoInterval);

    const browser = getSpeedoBrowser();browser.active=true;
    browser.execute('if (window.SPEEDO_UI) window.SPEEDO_UI.show();');
    lastVehPos = veh.position;lastPacket=null;

    speedoInterval = setInterval(() => {
        if (!mp.players.local.vehicle || !mp.vehicles.exists(veh)) {
            stopSpeedometerUpdates();
            return;
        }

        const speedKmh = Math.round(veh.getSpeed() * 3.6);
        let gear = 'D';
        const rawGear = veh.gear;

        if (speedKmh === 0) {
            gear = 'P';
        } else if (rawGear === 0) {
            gear = 'R';
        } else if (rawGear > 0) {
            gear = rawGear.toString();
        }

        const engineRunning = veh.getIsEngineRunning() ? 1 : 0;
        const lightsState = veh.getLightsState(1, 1);
        const lightsOn = (lightsState && (lightsState.lightsOn || lightsState.highbeamsOn)) ? 1 : 0;
        const doorLockStatus = veh.getDoorLockStatus ? veh.getDoorLockStatus() : 0;
        const isLocked = doorLockStatus === 2 ? 1 : 0;
        const fuel = veh.getVariable('fuel') !== undefined ? veh.getVariable('fuel') : 65;

        // RPM (0.0 to 1.0)
        let rpm = 0.0;
        try {
            rpm = typeof veh.rpm === 'number' ? veh.rpm : (speedKmh / 280);
        } catch (e) {
            rpm = speedKmh / 280;
        }

        // Handbrake
        const isHbk = mp.game.controls.isControlPressed(0, 76) ? 1 : 0;

        // Odometer distance accumulation
        const currPos = veh.position;
        if (lastVehPos) {
            const dx = currPos.x - lastVehPos.x;
            const dy = currPos.y - lastVehPos.y;
            const dz = currPos.z - lastVehPos.z;
            const distM = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (distM > 0.1 && distM < 100) {
                mileageKm += (distM / 1000);
            }
        }
        lastVehPos = currPos;
        const odoStr = String(Math.floor(mileageKm)).padStart(6, '0');

        const packet=JSON.stringify([speedKmh,gear,engineRunning,lightsOn,isLocked,fuel,Number(rpm.toFixed(2)),isHbk,odoStr]);
        if(packet!==lastPacket){lastPacket=packet;browser.execute('if(window.SPEEDO_UI)window.SPEEDO_UI.update(...'+packet+');');}
    }, 100); // 25 FPS update rate for smooth animation without micro-stutter
}

function stopSpeedometerUpdates() {
    if (speedoInterval) {
        clearInterval(speedoInterval);
        speedoInterval = null;
    }
    lastVehPos = null;
    if (speedoBrowser) {
        speedoBrowser.execute('if (window.SPEEDO_UI) window.SPEEDO_UI.hide();');speedoBrowser.active=false;
    }
}

// Слушатели посадки и высадки из транспорта
mp.events.add('playerEnterVehicle', (vehicle, seat) => {
    // seat -1 означает водительское место в RAGE:MP
    if (seat === -1) {
        startSpeedometerUpdates(vehicle);
    }
});

mp.events.add('playerLeaveVehicle', () => {
    stopSpeedometerUpdates();
});

// Если игрок умер или переспавнился в машине
mp.events.add('playerDeath', () => {
    stopSpeedometerUpdates();
});
