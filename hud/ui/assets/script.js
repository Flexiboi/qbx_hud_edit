var InVehicle = false
var Seatbelt = false
var Cruise = false
const alert_treshold = 10 // Percentage at which the stat bars will start blinking to alert the player
const color = '#f5881b'; // Main hud color
const default_hud_height = "1vh"; // Default hud height, used to reset the height after a cinematic mode or similar that changes the hud height

const hud = document.querySelector('#container');

const voice = document.querySelector('#voice rect');
const voice_gradient = document.querySelectorAll('#voiceGradient stop');

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
const rpm_bar = document.querySelector('.rpm_bar rect');
const rpm_bar_gradient = document.querySelectorAll('#rpmGradient stop');
const vehicle_fuel = document.querySelector('.vehicle_fuel rect');
const vehicle_fuel_gradient = document.querySelectorAll('#fuelGradient stop');
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
                if (data.playerDead) {
                    toggleHud(false);
                } else {
                    InVehicle = data.show;
                    Seatbelt = data.seatbelt;
                    Cruise = data.cruise;
                    if (data.fuel) {
                        vehicle_fuel.style.width = `${data.fuel}%`;
                        if (data.fuel <= 25) {
                            const colors = generateDarkToLightGradient(vehicle_fuel_gradient.length, "#982121");
                            vehicle_fuel_gradient.forEach((stop, index) => {
                                stop.setAttribute('style', `stop-color: ${colors[index]}; stop-opacity: 1`);
                            });
                        } else {
                            const colors = generateDarkToLightGradient(vehicle_fuel_gradient.length, "#368119");
                            vehicle_fuel_gradient.forEach((stop, index) => {
                                stop.setAttribute('style', `stop-color: ${colors[index]}; stop-opacity: 1`);
                            });
                        }
                    }
                    toggleCarHud(data.show);
                }
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
    hud.style.display = show ? 'none' : 'block';
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

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function generateDarkToLightGradient(steps, baseHex) {
    const baseRGB = hexToRgb(baseHex);
    const gradientArray = [];
    const darkFactor = 1.0; 
    const lightFactor = 1.4;
    const startColor = {
        r: Math.min(255, Math.floor(baseRGB.r * darkFactor)),
        g: Math.min(255, Math.floor(baseRGB.g * darkFactor)),
        b: Math.min(255, Math.floor(baseRGB.b * darkFactor))
    };
    const endColor = {
        r: Math.min(255, Math.floor(baseRGB.r * lightFactor)),
        g: Math.min(255, Math.floor(baseRGB.g * lightFactor)),
        b: Math.min(255, Math.floor(baseRGB.b * lightFactor))
    };
    for (let i = 0; i < steps; i++) {
        const factor = i / (steps - 1);
        const r = Math.round(startColor.r + (endColor.r - startColor.r) * factor);
        const g = Math.round(startColor.g + (endColor.g - startColor.g) * factor);
        const b = Math.round(startColor.b + (endColor.b - startColor.b) * factor);
        gradientArray.push(`rgb(${r}, ${g}, ${b})`);
    }
    return gradientArray;
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
    toggleHud(data.isPaused)
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

        if (data.talking) {
            const colors = generateDarkToLightGradient(voice_gradient.length, color);
            voice_gradient.forEach((stop, index) => {
                stop.setAttribute('style', `stop-color: ${colors[index]}; stop-opacity: 1`);
            });
        } else {
            const colors = generateDarkToLightGradient(voice_gradient.length, "#696969");
            voice_gradient.forEach((stop, index) => {
                stop.setAttribute('style', `stop-color: ${colors[index]}; stop-opacity: 1`);
            });
        }

        if(InVehicle){
            if(data.speed) {
                if (data.speed <= 1) {
                    speed.innerHTML = `<div class="grey_text">000</div>`;
                } else if (data.speed < 10) {
                    speed.innerHTML = `${data.speed <= 1 ? '0' : data.speed}<div class="grey_text">00</div>`;
                } else if (data.speed < 100) {
                    speed.innerHTML = `${data.speed}<div class="grey_text">0</div>`;
                } else {
                    speed.innerHTML = `${data.speed}`;
                }
            }

            if(data.gear) {
                gear.innerHTML = 'GEAR ' + (data.speed <= 1 ? 'N' : data.gear);
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
                    const colors = generateDarkToLightGradient(rpm_bar_gradient.length, "#bc1b1b");
                    rpm_bar_gradient.forEach((stop, index) => {
                        stop.setAttribute('style', `stop-color: ${colors[index]}; stop-opacity: 1`);
                    });
                } else {
                    const colors = generateDarkToLightGradient(rpm_bar_gradient.length, color);
                    rpm_bar_gradient.forEach((stop, index) => {
                        stop.setAttribute('style', `stop-color: ${colors[index]}; stop-opacity: 1`);
                    });
                }
                updateBar(rpm_bar, data.rpm*100);
            }
        }
    }
}

function addCustomStats(assets) {
    assets.forEach(function (item, index) {
        stats.innerHTML += `<div id="custom_stat_${item.name}" class="custom_stat icons">
            <i class="${item.icon}"></i>
            <svg style="border: solid ${item.border} 3px;">
                <defs>
                    <linearGradient id="gradient_${item.name}" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" style="stop-color:${item.fill}; stop-opacity:1" />
                        <stop offset="100%" style="stop-color:${item.fill}; stop-opacity:1" />
                    </linearGradient>
                </defs>
                <rect width="100%" height="100%" fill="url(#gradient_${item.name})" />
            </svg>
        </div>`;
        const newstat_gradient = document.querySelectorAll(`#gradient_${item.name} stop`);
        const colors = generateDarkToLightGradient(newstat_gradient.length, item.fill);
        newstat_gradient.forEach((stop, index) => {
            stop.setAttribute('style', `stop-color: ${colors[index]}; stop-opacity: 1`);
        });
        updateCustomStat(item.name, 0);
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