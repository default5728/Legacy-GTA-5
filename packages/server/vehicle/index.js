function safeEjectOccupants(vehicle) {
    try {
        if (!vehicle || !mp.vehicles.exists(vehicle)) return;
        let passengers;
        try { passengers = vehicle.getOccupants(); } catch (_e) { return; }
        if (!passengers) return;
        const list = [];
        try {
            if (typeof passengers.length === 'number') {
                for (let i = 0; i < passengers.length; i++) list.push(passengers[i]);
            } else if (typeof passengers.forEach === 'function') {
                passengers.forEach((p) => list.push(p));
            }
        } catch (_e) {}
        for (let i = 0; i < list.length; i++) {
            const p = list[i];
            try {
                if (p && mp.players.exists(p)) p.removeFromVehicle();
            } catch (_e) {}
        }
    } catch (_e) {}
}

global.deleteVeh = function(vehicle) {
    try {
        if (!vehicle || !mp.vehicles.exists(vehicle)) return;
        if (vehicle.getVariable('deleted')) return;

        vehicle.setVariable('deleted', true);

        const carOwner = vehicle.getVariable('owner');
        if (carOwner) {
            const targetPlayer = mp.players.toArray().find(p => p && p.static == carOwner);
            if (targetPlayer && mp.players.exists(targetPlayer) && carOwner === targetPlayer.static) {
                if(targetPlayer.carActive===vehicle)targetPlayer.carActive = null;
                try { vehicle.setVariable('owner', null); } catch (_e) {}
            }
        }

        try { vehicle.locked = true; } catch (_e) {}
        safeEjectOccupants(vehicle);

        if (vehicle && mp.vehicles.exists(vehicle)) {
            try { vehicle.engine = false; } catch (_e) {}
            try { vehicle.dimension = 0; } catch (_e) {}
            try {
                vehicle.position = new mp.Vector3(1069.5347900390625, 3041.273681640625, 41.34978103637695);
                vehicle.heading = 104.63792419433594;
            } catch (_e) {}
        }

        setTimeout(() => {
            try {
                if (vehicle && mp.vehicles.exists(vehicle)) vehicle.destroy();
            } catch (_e) {}
        }, 5000);
    } catch (_e) {}
};

global.deleteVehTwo = function(vehicle) {
    try {
        if (!vehicle || !mp.vehicles.exists(vehicle)) return;
        if (vehicle.getVariable('deleted')) return;

        vehicle.setVariable('deleted', true);
        try { vehicle.locked = true; } catch (_e) {}
        safeEjectOccupants(vehicle);

        if (vehicle && mp.vehicles.exists(vehicle)) {
            try { vehicle.engine = false; } catch (_e) {}
            try { vehicle.dimension = 0; } catch (_e) {}
            try {
                vehicle.position = new mp.Vector3(1069.5347900390625, 3041.273681640625, 41.34978103637695);
                vehicle.heading = 104.63792419433594;
            } catch (_e) {}
        }

        setTimeout(() => {
            try {
                if (vehicle && mp.vehicles.exists(vehicle)) vehicle.destroy();
            } catch (_e) {}
        }, 5000);
    } catch (_e) {}
};