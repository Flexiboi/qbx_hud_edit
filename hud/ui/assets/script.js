var InVehicle = false
var Seatbelt = false
var Cruise = false
const alert_treshold = 10 // Percentage at which the stat bars will start blinking to alert the player
const color = '#f5881b'; // Main hud color
const default_hud_height = "1vh"; // Default hud height, used to reset the height after a cinematic mode or similar that changes the hud height

const hud = document.querySelector('#container');

const voice = document.querySelector('#voice rect');

const stats = document.querySelector('#stats');
const health = document.querySelector('#health rect');
const armor = document.querySelector('#armor rect');
const hunger = document.querySelector('#hunger rect');
const thirst = document.querySelector('#thirst rect');
const oxygen = document.querySelector('#oxygen rect');

const vehicle = document.querySelector('#vehicle');
const compass = document.querySelector('#compass');
const degreesElement = document.querySelector('#compass #degrees');
const speed = document.querySelector('#speed_number');
const gear = document.querySelector('#speed_gear');
const speed_bar = document.querySelector('.speed_bar rect');
const vehicle_fuel = document.querySelector('.vehicle_fuel rect');
const street = document.querySelector('#compass #street');

window.addEventListener('message', function(event) {
    const data = event.data;
    try {
        switch (data.action) {
            case 'compass':
                updateCompass(data.value);
                break;
            case 'streetnames':
                updateStreetNames(data.show, data.street1, data.street2);
                break;
            case 'hudtick':
                if (data.playerDead) {
                    toggleHud(false);
                } else {
                    hudTick(data);
                }
                break;
            case 'car':
                InVehicle = data.show;
                Seatbelt = data.seatbelt;
                Cruise = data.cruise;
                if (data.fuel) {
                    vehicle_fuel.style.width = `${data.fuel}%`;
                    if (data.fuel <= 25) {
                        if (vehicle_fuel.style.fill === "#1f8e3b") {
                            vehicle_fuel.style.fill = '#bc1b1b';
                        }
                    } else {
                        if (vehicle_fuel.style.fill !== "#1f8e3b") {
                            vehicle_fuel.style.fill = "#1f8e3b";
                        }
                    }
                }
                toggleCarHud(data.show);
                break;
            case 'addCustomStats':
                addCustomStats(data.assets);
                break;
            case 'removeCustomStat':
                removeCustomStat(data.statname);
                break;
            case 'updateCustomStat':
                updateCustomStat(data.id, data.value);
                break;
            case 'setHudHeight':
                SetHudHeight(data.height, data.type);
                break;
            case 'resetHudHeight':
                ResetHudHeight(data.type);
                break;
            default:
                break;
        }
    } catch (error) {
        console.error('Error handling message:', error);
    }
});

function toggleHud(show) {
    hud.style.display = show ? 'block' : 'none';
}

function toggleCarHud(show) {
    vehicle.style.display = show ? 'block' : 'none';
}

function getCardinalDirection(degrees) {
    const d = Number(degrees) % 360;
    if (d < 0) return 'N';
    if (d >= 315 || d < 45) return 'N';
    if (d >= 45 && d < 135) return 'E';
    if (d >= 135 && d < 225) return 'S';
    return 'W';
}

function updateCompass(value) {
    const direction = getCardinalDirection(value);
    degreesElement.innerHTML = `${Number(value)}° ${direction}`;
}

function updateStreetNames(show, street1, street2) {
    compass.style.display = show ? 'block' : 'none';
    if(!show) return;
    
    street.innerHTML = street1;
}

const updateBar = (element, value) => {
    if (element) {
        element.style.width = `${Math.floor(value)}%`;
    }
};

const checkStatAlert = (element, value) => {
    if (element) {
        const elementInFront = element.parentElement.parentElement;

        if (Math.floor(value) <= 50 && !elementInFront.classList.contains('blinking_alert')) {
            elementInFront.classList.add('blinking_alert');
        } else if (Math.floor(value) > 50 && elementInFront.classList.contains('blinking_alert')) {
            elementInFront.classList.remove('blinking_alert');
        }

        if (Math.floor(value) <= 0 || Math.floor(value) >= 100) {
            elementInFront.style.display = 'none';
            return;
        } else {
            elementInFront.style.display = 'block';
        }
    }
}

function hudTick(data) {
    if (data.show) {
        updateBar(health, data.health);
        checkStatAlert(health, data.health);
        updateBar(armor, data.armor);
        checkStatAlert(armor, data.armor);
        updateBar(hunger, data.hunger);
        checkStatAlert(hunger, data.hunger);
        updateBar(thirst, data.thirst);
        checkStatAlert(thirst, data.thirst);
        updateBar(oxygen, data.oxygen);
        checkStatAlert(oxygen, data.oxygen);

        switch (data.voice) {
            case 0:
                voice.style.width = `33%`;
                break;
            case 1:
                voice.style.width = `66%`;
                break;
            case 2:
                voice.style.width = `100%`;
                break;
            default:
                voice.style.width = `33%`;
                break;
        }
        voice.style.fill = data.talking ? color : '#3d3d3d';

        if(InVehicle){
            if(data.speed) {
                if (data.speed < 10) {
                    speed.innerHTML = `${data.speed}<div class="grey_text">00</div>`;
                } else if (data.speed < 100) {
                    speed.innerHTML = `${data.speed}<div class="grey_text">0</div>`;
                } else {
                    speed.innerHTML = `${data.speed}`;
                }
            }

            if(data.gear) {
                gear.innerHTML = 'GEAR ' + (data.gear === 0 ? 'R' : data.gear === 1 ? 'N' : data.gear);
            }

            if(data.engine) {
                if (data.engine <= 25) {
                    if (speed.style.color === color) {
                        speed.style.color = '#bc1b1b';
                    }
                } else {
                    if (speed.style.color !== color) {
                        speed.style.color = color;
                    }
                }
            }

            if (data.showSeatbelt) {
                gear.style.fill = color;
            } else {
                gear.style.fill = '#d3d3d3';
            }

            if (data.rpm) {
                if (data.rpm*100 >= 90) {
                    speed_bar.style.fill = '#bc1b1b';
                } else {
                    if (speed_bar.style.fill !== color) {
                        speed_bar.style.fill = color;
                    }
                }
                updateBar(speed_bar, data.rpm*100);
            }
        }
    }
}

function addCustomStats(assets) {
    assets.forEach(function (item, index) {
        stats.innerHTML += `<div id="custom_stat_${item.name}" class="custom_stat icons">
            <i class="${item.icon}"></i>
            <svg style="border: solid ${item.border} 3px;">
                <rect fill="${item.fill}" />
            </svg>
        </div>`;
    });
}

function removeCustomStat(name) {
    const stat = document.querySelector(`#custom_stat_${name}`);
    if (stat) {
        stat.remove();
    }
}

function updateCustomStat(id, value) {
    const stat = document.querySelector(`#custom_stat_${id} svg rect`);
    stat.style.width = `${value}%`;
}

function SetHudHeight(height, type) {
    if(type !== null) {
        if (type === "stats") {
            stats.style.bottom = height+"vh";
        } else if (type === "car") {
            vehicle.style.bottom = height+"vh";
        }
    } else {
        stats.style.bottom = height+"vh";
        vehicle.style.bottom = height+"vh";
    }
}

function ResetHudHeight(type) {
    if(type !== null) {
        if (type === "stats") {
            stats.style.bottom = default_hud_height;
        } else if (type === "car") {
            vehicle.style.bottom = default_hud_height;
        }
    } else {
        stats.style.bottom = default_hud_height;
        vehicle.style.bottom = default_hud_height;
    }
}