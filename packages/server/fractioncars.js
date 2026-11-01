mp.events.add('packagesLoaded', () => {
    Object.keys(global.fractioncars).forEach(fraction => {
        global.fractioncars[fraction].forEach(carData => {
            let vehicle = mp.vehicles.new(mp.joaat(carData.model), carData.position,
                {
                    heading: carData.heading,
                    color: carData.color,
                    locked: carData.locked,
                    engine: carData.engine,
                    numberPlate: global.flowVehiclePlate()
                }
            );
            
            vehicle.setVariable('fractioncar', true);
            vehicle.setVariable('lvl', carData.lvl);
            vehicle.setVariable('fraction', fraction);

            vehicle.setVariable('startposition', carData.position);
            vehicle.setVariable('startheading', carData.heading);
            vehicle.setVariable('startnumber', global.flowVehiclePlate());
            if (carData.fibMatsTruck === true) {
                vehicle.setVariable('fibMatsTruck', true);
                vehicle.setVariable('fibMatsLoaded', false);
                vehicle.locked = false;
                vehicle.setVariable('doorState', false);
            }
        });
    });
});

mp.events.add('vehicleDeath', (vehicle) => {
    try {
        if (!vehicle || !mp.vehicles.exists(vehicle) || vehicle.getVariable('deleted')) return;

        if (vehicle.getVariable('fractioncar') === true) {
            // Помечаем машину как удалённую сразу, чтобы предотвратить повторный спавн
            vehicle.setVariable('deleted', true);
            
            let startposition = vehicle.getVariable('startposition');
            let startheading = vehicle.getVariable('startheading');
            let startnumber = vehicle.getVariable('startnumber');
            
            if (startposition && startheading) {
                const isFibMats = vehicle.getVariable('fibMatsTruck') === true;
                let newVehicle = mp.vehicles.new(vehicle.model, startposition, {
                    heading: startheading,
                    color: global.color[vehicle.getVariable('fraction')],
                    locked: isFibMats ? false : true,
                    engine: false,
                    numberPlate: global.flowVehiclePlate()
                });

                newVehicle.setVariable('fractioncar', true);
                newVehicle.setVariable('lvl', vehicle.getVariable('lvl'));
                newVehicle.setVariable('fraction', vehicle.getVariable('fraction'));

                newVehicle.setVariable('startposition', startposition);
                newVehicle.setVariable('startheading', startheading);
                newVehicle.setVariable('startnumber', global.flowVehiclePlate());
                if (vehicle.getVariable('fibMatsTruck') === true) {
                    newVehicle.setVariable('fibMatsTruck', true);
                    newVehicle.setVariable('fibMatsLoaded', false);
                    newVehicle.locked = false;
                    newVehicle.setVariable('doorState', false);
                }
            }
            
            // Удаляем старую машину
            vehicle.locked = true;
            const passengers = vehicle.getOccupants();
            passengers.forEach(player => {
                if (player && mp.players.exists(player)) {
                    player.removeFromVehicle();
                }
            });
            
            if (vehicle && mp.vehicles.exists(vehicle)) {
                vehicle.engine = false;
                vehicle.dimension = 0;
                vehicle.position = new mp.Vector3(1069.5347900390625, 3041.273681640625, 41.34978103637695);
            }
            
            setTimeout(() => {
                if (vehicle && mp.vehicles.exists(vehicle)) {
                    vehicle.destroy();
                }
            }, 5000);
        }
    } catch (error) {
        console.log(error);
    }
});