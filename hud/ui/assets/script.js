let mainColor = '#f5881b'
let lowEngineColor = '#bc1b1b'
let vehicleFuelColor = '#f5881b'
let engineGoodColor = '#27ae60'
let engineBadColor = '#e74c3c'

let hud
let stats
let vehicle
let voice
let voiceGradient
let health
let armor
let hunger
let thirst
let oxygen
let stress
let compass
let degreesElement
let speed
let gear
let rpmBar
let rpmGradient
let vehicleFuel
let engineBar
let fuelGradient
let street
let seatbeltElement

let lastValues = {
    isPaused: null,
    show: null,
    health: null,
    armor: null,
    hunger: null,
    thirst: null,
    oxygen: null,
    stress: null,
    voice: null,
    talking: null,
    voiceGradientColor: null,
    voiceGradientLength: null,
    speed: null,
    gear: null,
    gearColor: null,
    seatbelt: null,
    engineHealth: null,
    engineDisplayColor: null,
    rpm: null,
    rpmGradientColor: null,
    rpmGradientLength: null,
    fuel: null,
    carHudVisible: null
}

let hudThresholds = {
    hide: 90,
    blink: 15,
}

function setGradientFill(id, colors) {
    if (!id || !Array.isArray(colors) || colors.length < 2) return
    const stops = document.querySelectorAll(`#${id} stop`)
    if (!stops.length) return
    stops.forEach((stop, index) => {
        const color = colors[index] || colors[colors.length - 1]
        stop.setAttribute('stop-color', color)
        stop.setAttribute('stop-opacity', '1')
        stop.removeAttribute('style')
    })
}

function applyHudColors(config) {
    if (!config) return

    const healthBox = document.querySelector('#health');
    if (!healthBox) console.warn("HUD Element #health not found!");

    mainColor = config.primary || mainColor
    lowEngineColor = config.lowEngine || lowEngineColor
    if (config.vehicle) {
        vehicleFuelColor = config.vehicle.fuel || vehicleFuelColor
        engineGoodColor = config.vehicle.engineGood || engineGoodColor
        engineBadColor = config.vehicle.engineBad || engineBadColor
    }

    const ui = config.ui || {}
    document.documentElement.style.setProperty('--hud-primary', ui.primary || mainColor)
    document.documentElement.style.setProperty('--hud-button-hover', ui.buttonHover || '#e07a16')
    document.documentElement.style.setProperty('--hud-editing-bg', ui.editingBg || 'rgba(245, 136, 27, 0.2)')
    document.documentElement.style.setProperty('--hud-minimap-bg', ui.minimapBg || 'rgba(245, 136, 27, 0.15)')
    document.documentElement.style.setProperty('--hud-minimap-border', ui.minimapBorder || (ui.primary || mainColor))
    document.documentElement.style.setProperty('--hud-fuel', (config.vehicle && config.vehicle.fuel) || vehicleFuelColor)
    document.documentElement.style.setProperty('--hud-engine-good', (config.vehicle && config.vehicle.engineGood) || engineGoodColor)
    document.documentElement.style.setProperty('--hud-engine-bad', (config.vehicle && config.vehicle.engineBad) || engineBadColor)

    const statsColors = config.stats || {}
    const statMapping = {
        health: 'healthGradient',
        hunger: 'hungerGradient',
        thirst: 'thirstGradient',
        armor: 'armorGradient',
        oxygen: 'oxygenGradient',
        stress: 'stressGradient'
    }

    Object.entries(statsColors).forEach(([statName, colors]) => {
        const statBox = document.querySelector(`#${statName}`);
        if (statBox && Array.isArray(colors)) {
            setGradientFill(statMapping[statName], colors);
            
            const borderColor = colors[1] || colors[0];
            const svg = statBox.querySelector('svg');
            if (svg) {
                svg.style.setProperty('border', `solid ${borderColor} 3px`, 'important');
            }
        }
    });
}

function initHudElements() {
    hud = document.querySelector('#container')
    stats = document.querySelector('#stats')
    vehicle = document.querySelector('#vehicle')
    seatbeltElement = document.querySelector('#seatbelt_status')
    voice = document.querySelector('#voice rect')
    voiceGradient = document.querySelectorAll('#voiceGradient stop')
    health = document.querySelector('#health rect')
    armor = document.querySelector('#armor rect')
    hunger = document.querySelector('#hunger rect')
    thirst = document.querySelector('#thirst rect')
    oxygen = document.querySelector('#oxygen rect')
    stress = document.querySelector('#stress rect')
    compass = document.querySelector('#compass')
    degreesElement = document.querySelector('#compass #degrees')
    speed = document.querySelector('#speed_number')
    gear = document.querySelector('#speed_gear')
    rpmBar = document.querySelector('.rpm_bar rect')
    rpmGradient = document.querySelectorAll('#rpmGradient stop')
    vehicleFuel = document.querySelector('#fuel_bar')
    engineBar = document.querySelector('#engine_bar')
    fuelGradient = document.querySelectorAll('#fuelGradient stop')
    street = document.querySelector('#compass #street')

    if (vehicle) {
        vehicle.style.display = 'none'
    }
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => {
        initHudElements();
        updateMinimapShiftState();
        initializeMinimapAnchor();
    })
} else {
    initHudElements()
}

window.addEventListener('message', function(event) {
    const data = event.data
    try {
        switch (data.action) {
            case 'compass':
                updateCompass(data.value)
                break
            case 'streetnames':
                updateStreetNames(data.show, data.street1, data.street2)
                break
            case 'hudtick':
                if (data.playerDead) {
                    toggleHud(false)
                    if (typeof updateMinimapShiftState === 'function') {
                        updateMinimapShiftState()
                    }
                } else {
                    hudTick(data)
                }
                break
            case 'car':
                if (data.playerDead) {
                    toggleHud(false)
                } else {
                    if (data.seatbelt !== undefined) {
                        updateSeatbeltStatus(data.seatbelt)
                    }
                    if (data.fuel !== undefined) {
                        updateFuelBar(data.fuel)
                    }
                    if (data.engine !== undefined) {
                        updateEngineHealthBar(data.engine)
                        updateEngineDisplay(data.engine)
                    }
                    if (data.speed !== undefined) {
                        updateSpeedDisplay(data.speed)
                    }
                    if (data.gear !== undefined) {
                        updateGearDisplay(data.gear, data.showSeatbelt)
                    }
                    if (data.rpm !== undefined) {
                        updateRpmBar(data.rpm)
                    }
                    toggleCarHud(data.show)
                }
                break
            case 'addCustomStats':
                addCustomStats(data.assets)
                break
            case 'hudConfig':
                if (typeof data.hideThreshold === 'number') {
                    hudThresholds.hide = data.hideThreshold
                }
                if (typeof data.blinkThreshold === 'number') {
                    hudThresholds.blink = data.blinkThreshold
                }
                if (data.colors) {
                    applyHudColors(data.colors)
                }
                break
            case 'removeCustomStat':
                removeCustomStat(data.statname)
                break
            case 'updateCustomStat':
                updateCustomStat(data.id, data.value)
                break
            case 'updateStress':
                if (lastValues.stress !== data.stress) {
                    updateBar(stress, data.stress)
                    lastValues.stress = data.stress
                }
                checkStatAlert(stress, data.stress)
                break
            case 'setHudHeight':
                setHudHeight(data.height, data.type)
                break
            case 'resetHudHeight':
                resetHudHeight(data.type)
                break
        }
    } catch (error) {
        console.error('Error handling message:', error)
    }
})

function toggleHud(show, isPaused) {
    if (!hud) return
    const shouldShow = Boolean(show && !isPaused)
    if (lastValues.isPaused === shouldShow) return
    lastValues.isPaused = shouldShow
    hud.style.display = shouldShow ? '' : 'none'
}

function toggleCarHud(show) {
    if (!vehicle) return
    if (lastValues.carHudVisible === show) return
    lastValues.carHudVisible = show
    vehicle.style.display = show ? '' : 'none'
}

function getCardinalDirection(degrees) {
    const d = Number(degrees) % 360
    if (d < 0) return 'N'
    if (d >= 315 || d < 45) return 'N'
    if (d >= 45 && d < 135) return 'E'
    if (d >= 135 && d < 225) return 'S'
    return 'W'
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null
}

function generateDarkToLightGradient(steps, baseHex) {
    const baseRGB = hexToRgb(baseHex)
    if (!baseRGB) return []
    const gradientArray = []
    const startColor = { r: Math.min(255, Math.floor(baseRGB.r * 1.0)), g: Math.min(255, Math.floor(baseRGB.g * 1.0)), b: Math.min(255, Math.floor(baseRGB.b * 1.0)) }
    const endColor = { r: Math.min(255, Math.floor(baseRGB.r * 1.4)), g: Math.min(255, Math.floor(baseRGB.g * 1.4)), b: Math.min(255, Math.floor(baseRGB.b * 1.4)) }
    for (let i = 0; i < steps; i++) {
        const factor = i / (steps - 1)
        const r = Math.round(startColor.r + (endColor.r - startColor.r) * factor)
        const g = Math.round(startColor.g + (endColor.g - startColor.g) * factor)
        const b = Math.round(startColor.b + (endColor.b - startColor.b) * factor)
        gradientArray.push(`rgb(${r}, ${g}, ${b})`)
    }
    return gradientArray
}

function updateCompass(value) {
    const direction = getCardinalDirection(value)
    if (!degreesElement) return
    degreesElement.innerHTML = `${Number(value)}° ${direction}`
}

function updateSeatbeltStatus(enabled) {
    if (!seatbeltElement) return
    const value = Boolean(enabled)
    if (lastValues.seatbelt === value) return
    lastValues.seatbelt = value
    seatbeltElement.classList.toggle('active', value)
}

function updateStreetNames(show, street1, street2) {
    if (!compass) return
    compass.style.display = show ? 'block' : 'none'
    if (!show) return
    if (street && street.innerHTML !== street1) {
        street.innerHTML = street1
    }
}

const updateBar = (element, value) => {
    if (!element) return;
    const width = `${Math.floor(value)}%`;
    if (element.style.width !== width) {
        element.style.width = width;
    }
}

const checkStatAlert = (element, value) => {
    if (!element) return
    const alertRow = element.closest('.vehicle_stat, .icons') || element.parentElement.parentElement
    if (!alertRow) return

    const currentValue = Number(value)
    if (Number.isNaN(currentValue)) {
        alertRow.classList.remove('blinking_alert')
        alertRow.style.display = 'none'
        return
    }

    const roundedValue = Math.floor(currentValue)
    if (!alertRow.dataset.alertDefaultDisplay) {
        let defaultDisplay = window.getComputedStyle(alertRow).display
        if (!defaultDisplay || defaultDisplay === 'none') {
            defaultDisplay = alertRow.classList.contains('icons') ? 'flex' : 'block'
        }
        alertRow.dataset.alertDefaultDisplay = defaultDisplay
    }

    const statId = alertRow.id
    const isSquareStat = alertRow.classList.contains('icons')
    let shouldHide = false

    if (isSquareStat) {
        if (roundedValue <= 1) {
            shouldHide = true
        }
        if (statId !== 'stress' && roundedValue >= hudThresholds.hide) {
            shouldHide = true
        }
    } else {
        if (roundedValue <= 0) {
            shouldHide = true
        }
        if (statId !== 'stress' && roundedValue >= hudThresholds.hide) {
            shouldHide = true
        }
    }
    if (shouldHide) {
        alertRow.classList.remove('blinking_alert')
        alertRow.style.display = 'none'
        alertRow.dataset.lastAlertValue = roundedValue
        if (typeof updateMinimapShiftState === 'function') {
            updateMinimapShiftState()
        }
        return
    }

    if (statId !== 'stress' && currentValue <= hudThresholds.blink) {
        alertRow.classList.add('blinking_alert')
    } else {
        alertRow.classList.remove('blinking_alert')
    }

    alertRow.style.display = alertRow.dataset.alertDefaultDisplay || (isSquareStat ? 'flex' : 'block')
    alertRow.dataset.lastAlertValue = roundedValue
    if (typeof updateMinimapShiftState === 'function') {
        updateMinimapShiftState()
    }
}

function updateVoiceBar(voiceLevel, isTalking) {
    if (!voice) return
    const level = voiceLevel-1
    const talking = Boolean(isTalking)
    if (lastValues.voice === level && lastValues.talking === talking) return
    lastValues.voice = level
    lastValues.talking = talking
    const widths = ['33%', '66%', '100%']
    voice.style.width = widths[level]

    if (!voiceGradient.length) return
    const color = talking ? mainColor : '#696969'
    if (lastValues.voiceGradientColor === color && lastValues.voiceGradientLength === voiceGradient.length) return
    lastValues.voiceGradientColor = color
    lastValues.voiceGradientLength = voiceGradient.length
    const colors = generateDarkToLightGradient(voiceGradient.length, color)
    voiceGradient.forEach((stop, index) => {
        stop.setAttribute('style', `stop-color: ${colors[index]}; stop-opacity: 1`)
    })
}

function updateFuelBar(fuel) {
    if (!vehicleFuel) return
    const value = Math.min(100, Math.max(0, fuel))
    if (lastValues.fuel === value) return
    lastValues.fuel = value
    vehicleFuel.style.width = `${value}%`
    vehicleFuel.style.background = value <= 25 ? engineBadColor : vehicleFuelColor
    checkStatAlert(vehicleFuel, value)
}

function updateEngineHealthBar(engineHealth) {
    if (!engineBar) return
    const value = Math.min(100, Math.max(0, Math.floor(engineHealth)))
    if (lastValues.engineHealth === value) return
    lastValues.engineHealth = value
    engineBar.style.width = `${value}%`
    engineBar.style.background = value <= 25 ? engineBadColor : engineGoodColor
    checkStatAlert(engineBar, value)
}

function updateSpeedDisplay(speedValue) {
    if (!speed) return
    const value = Number(speedValue)
    if (lastValues.speed === value) return
    lastValues.speed = value
    let html
    if (value <= 1) {
        html = '<div class="grey_text">000</div>'
    } else if (value < 10) {
        html = `${value}<span class="grey_text">00</span>`
    } else if (value < 100) {
        html = `${value}<span class="grey_text">0</span>`
    } else {
        html = `${value}`
    }
    if (speed.innerHTML !== html) {
        speed.innerHTML = html
    }
}

function updateGearDisplay(gearValue, showSeatbelt) {
    if (!gear) return
    const label = 'GEAR ' + (gearValue <= 1 ? 'N' : gearValue)
    const color = showSeatbelt ? mainColor : '#d3d3d3'
    if (lastValues.gear === gearValue && lastValues.gearColor === color) return
    lastValues.gear = gearValue
    lastValues.gearColor = color
    if (gear.innerHTML !== label) {
        gear.innerHTML = label
    }
    gear.style.color = color
}

function updateEngineDisplay(engineHealth) {
    if (!speed) return
    const value = Math.min(100, Math.max(0, Math.floor(engineHealth)))
    const color = value <= 25 ? lowEngineColor : mainColor
    if (lastValues.engineDisplayColor === color) return
    lastValues.engineDisplayColor = color
}

function updateRpmBar(rpm) {
    if (!rpmBar) return
    if (!rpmGradient.length) return
    const value = Math.max(0, Math.min(1, rpm))
    const color = value * 100 >= 90 ? lowEngineColor : mainColor
    if (lastValues.rpm === value && lastValues.rpmGradientColor === color) {
        updateBar(rpmBar, value * 100)
        return
    }
    lastValues.rpm = value
    lastValues.rpmGradientColor = color
    lastValues.rpmGradientLength = rpmGradient.length
    const colors = generateDarkToLightGradient(rpmGradient.length, color)
    rpmGradient.forEach((stop, index) => {
        stop.setAttribute('style', `stop-color: ${colors[index]}; stop-opacity: 1`)
    })
    updateBar(rpmBar, value * 100)
}

function hudTick(data) {
    toggleHud(data.show, data.isPaused)
    if (!data.show) return

    if (lastValues.health !== data.health) {
        updateBar(health, data.health)
        lastValues.health = data.health
    }
    checkStatAlert(health, data.health)
    if (lastValues.armor !== data.armor) {
        updateBar(armor, data.armor)
        lastValues.armor = data.armor
    }
    checkStatAlert(armor, data.armor)

    if (lastValues.hunger !== data.hunger) {
        updateBar(hunger, data.hunger)
        lastValues.hunger = data.hunger
    }
    checkStatAlert(hunger, data.hunger)

    if (lastValues.thirst !== data.thirst) {
        updateBar(thirst, data.thirst)
        lastValues.thirst = data.thirst
    }
    checkStatAlert(thirst, data.thirst)

    if (lastValues.oxygen !== data.oxygen) {
        updateBar(oxygen, data.oxygen)
        lastValues.oxygen = data.oxygen
    }
    checkStatAlert(oxygen, data.oxygen)

    if (lastValues.stress !== data.stress) {
        updateBar(stress, data.stress)
        lastValues.stress = data.stress
    }
    checkStatAlert(stress, data.stress)

    if (data.seatbelt !== undefined) {
        updateSeatbeltStatus(data.seatbelt)
    }
    if (data.speed !== undefined) {
        updateSpeedDisplay(data.speed)
    }
    if (data.gear !== undefined) {
        updateGearDisplay(data.gear, data.showSeatbelt || data.seatbelt)
    }
    if (data.engine !== undefined) {
        updateEngineDisplay(data.engine)
        updateEngineHealthBar(data.engine)
    }
    if (data.rpm !== undefined) {
        updateRpmBar(data.rpm)
    }

    updateVoiceBar(data.voice, data.talking)
    updateMinimapShiftState()
}

function addCustomStats(assets) {
    assets.forEach(function(item, index) {
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
        </div>`
        const newStatGradient = document.querySelectorAll(`#gradient_${item.name} stop`)
        const colors = generateDarkToLightGradient(newStatGradient.length, item.fill)
        newStatGradient.forEach((stop, index) => {
            stop.setAttribute('style', `stop-color: ${colors[index]}; stop-opacity: 1`)
        })
        updateCustomStat(item.name, 0)
    })
}

function removeCustomStat(name) {
    const stat = document.querySelector(`#custom_stat_${name}`)
    if (stat) {
        stat.remove()
    }
}

function updateCustomStat(id, value) {
    const stat = document.querySelector(`#custom_stat_${id} svg rect`)
    if (!stat) return
    stat.style.width = `${value}%`
    checkStatAlert(stat, value)
    updateMinimapShiftState()
}

function setHudHeight(height, type) {
    if (type === "stats") {
        stats.style.bottom = height + "vh"
    } else if (type === "car") {
        vehicle.style.bottom = height + "vh"
    } else {
        stats.style.bottom = height + "vh"
        vehicle.style.bottom = height + "vh"
    }
}

function resetHudHeight(type) {
    if (type === "stats") {
        stats.style.bottom = "1vh"
    } else if (type === "car") {
        vehicle.style.bottom = "1vh"
    } else {
        stats.style.bottom = "1vh"
        vehicle.style.bottom = "1vh"
    }
}

function getMinimapCallbackUrl() {
    if (typeof GetParentResourceName === 'function') {
        return `https://${GetParentResourceName()}/setMinimapState`
    }
    return 'https://hud/setMinimapState'
}

function sendMinimapShiftState(shifted) {
    fetch(getMinimapCallbackUrl(), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=UTF-8'
        },
        body: JSON.stringify({ shifted })
    }).catch((error) => {
        console.error('Failed to update minimap state:', error)
    })
}

let shiftTimer;
function updateMinimapShiftState() {
    clearTimeout(shiftTimer);
    shiftTimer = setTimeout(() => {
        const iconNodes = Array.from(document.querySelectorAll('#stats .icons'))
        const activeIconCount = iconNodes.filter((node) => {
            const style = window.getComputedStyle(node)
            return style.display !== 'none' && node.offsetParent !== null
        }).length

        const shifted = activeIconCount > 0
        if (updateMinimapShiftState.lastShifted === shifted) {
            return
        }
        updateMinimapShiftState.lastShifted = shifted
        sendMinimapShiftState(shifted)
    }, 50); // Only run 50ms after the last request
}

updateMinimapShiftState.lastShifted = null

const minimapIconObserver = new MutationObserver(updateMinimapShiftState)
minimapIconObserver.observe(document.body, {
    attributes: true,
    childList: true,
    subtree: true,
    characterData: true,
})

// === HUD Dragging, Settings & Dedicated Minimap Anchor Logic ===
let isEditing = false;
let dragItem = null;
let offsetX = 0;
let offsetY = 0;

const statsEl = document.querySelector('#stats');
const vehicleEl = document.querySelector('#vehicle');
const minimapAnchorEl = document.querySelector('#minimap_anchor');

const settingsMenu = document.querySelector('#settings_menu');
const saveBtn = document.querySelector('#save_hud');
const resetBtn = document.querySelector('#reset_hud');
const closeBtn = document.querySelector('#close_hud');

// Store the default position and size when the UI opens/loads
let defaultMapRect = null;

function initializeMinimapAnchor() {
    defaultMapRect = minimapAnchorEl.getBoundingClientRect();
}

// Call this when dragging ends or when saving the layout
function saveMinimapPosition() {
    const currentMapRect = minimapAnchorEl.getBoundingClientRect();
    
    if (!defaultMapRect) return;

    // Calculate how many "widths" or "heights" the box has shifted
    const moveRatioX = (currentMapRect.left - defaultMapRect.left) / defaultMapRect.width;
    const moveRatioY = (currentMapRect.top - defaultMapRect.top) / defaultMapRect.height;

    fetch(`https://${GetParentResourceName()}/saveMinimapPosition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            moveRatioX: moveRatioX,
            moveRatioY: moveRatioY
        })
    });
}

function getMinimapDeltas() {
    const currentMapRect = minimapAnchorEl.getBoundingClientRect();
    
    // Reset to find the "default" position
    const savedLeft = minimapAnchorEl.style.left;
    const savedTop = minimapAnchorEl.style.top;
    minimapAnchorEl.style.left = ''; 
    minimapAnchorEl.style.top = '';
    const defaultRect = minimapAnchorEl.getBoundingClientRect();
    minimapAnchorEl.style.left = savedLeft;
    minimapAnchorEl.style.top = savedTop;

    // Calculate normalized 0.0 - 1.0 values
    return {
        x: (currentMapRect.left - defaultRect.left) / window.innerWidth,
        y: (currentMapRect.top - defaultRect.top) / window.innerHeight
    };
}

document.addEventListener('mousemove', (e) => {
    if (!isEditing || !dragItem) return;

    dragItem.style.left = `${e.clientX - offsetX}px`;
    dragItem.style.top = `${e.clientY - offsetY}px`;

    if (dragItem === minimapAnchorEl) {
        const defaultRect = defaultMapRect;
        const currentRect = minimapAnchorEl.getBoundingClientRect();

        if (!defaultMapRect) {
            initializeMinimapAnchor();
        }

            const rect = minimapAnchorEl.getBoundingClientRect();
            const payload = {
                x: rect.left / window.innerWidth,
                y: rect.top / window.innerHeight
            };
            fetch(`https://${GetParentResourceName()}/updateLiveMinimap`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
    }
});

// Save Action
saveBtn.addEventListener('click', () => {
    isEditing = false;
    statsEl.classList.remove('editing');
    vehicleEl.classList.remove('editing');
    minimapAnchorEl.classList.remove('editing');
    settingsMenu.style.display = 'none';

    const deltas = getMinimapDeltas();

    fetch(`https://${GetParentResourceName()}/saveHudPositions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            statsX: statsEl.style.left,
            statsY: statsEl.style.top,
            vehicleX: vehicleEl.style.left,
            vehicleY: vehicleEl.style.top,
            minimapX: minimapAnchorEl.style.left,
            minimapY: minimapAnchorEl.style.top,
            minimapOffsetX: deltas.x,
            minimapOffsetY: deltas.y
        })
    });
});

// Reset Action
resetBtn.addEventListener('click', () => {
    isEditing = false;
    statsEl.classList.remove('editing');
    vehicleEl.classList.remove('editing');
    minimapAnchorEl.classList.remove('editing');
    settingsMenu.style.display = 'none';

    statsEl.style.left = ''; statsEl.style.top = ''; statsEl.style.bottom = ''; statsEl.style.right = '';
    vehicleEl.style.left = ''; vehicleEl.style.top = ''; vehicleEl.style.bottom = ''; vehicleEl.style.right = '';
    minimapAnchorEl.style.left = ''; minimapAnchorEl.style.top = ''; minimapAnchorEl.style.bottom = ''; minimapAnchorEl.style.right = '';

    const rect = minimapAnchorEl.getBoundingClientRect();
    const payload = {
        x: rect.left / window.innerWidth,
        y: rect.top / window.innerHeight
    };
    fetch(`https://${GetParentResourceName()}/updateLiveMinimap`, {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    fetch(`https://${GetParentResourceName()}/resetHudPositions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
});

// Close Action
closeBtn.addEventListener('click', () => {
    isEditing = false;
    statsEl.classList.remove('editing');
    vehicleEl.classList.remove('editing');
    minimapAnchorEl.classList.remove('editing');
    settingsMenu.style.display = 'none';
    fetch(`https://${GetParentResourceName()}/closeSettings`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
});

// Drag Engine Click Handlers
document.addEventListener('mousedown', (e) => {
    if (!isEditing) return;
    
    if (e.target.closest('#stats')) { dragItem = statsEl; } 
    else if (e.target.closest('#vehicle')) { dragItem = vehicleEl; }
    else if (e.target.closest('#minimap_anchor')) { dragItem = minimapAnchorEl; }

    if (dragItem) {
        const rect = dragItem.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        dragItem.style.position = "fixed";
        dragItem.style.bottom = 'auto';
        dragItem.style.right = 'auto';
    }
});

document.addEventListener('mouseup', () => { dragItem = null; });

// Handle incoming NUI signals
window.addEventListener('message', function(event) {
    const data = event.data;
    
    if (data.action === 'openSettings') {
        initializeMinimapAnchor();
        isEditing = true;
        settingsMenu.style.display = 'block';
        statsEl.classList.add('editing');
        vehicleEl.classList.add('editing');
        minimapAnchorEl.classList.add('editing');
        vehicleEl.style.display = 'flex'; 
        
        if (statsEl.style.left) statsEl.style.bottom = 'auto';
        if (minimapAnchorEl.style.left) minimapAnchorEl.style.bottom = 'auto';
        if (vehicleEl.style.left) { vehicleEl.style.bottom = 'auto'; vehicleEl.style.right = 'auto'; }
    } 
    else if (data.action === 'loadPositions') {
        if (data.statsX) { statsEl.style.bottom = 'auto'; statsEl.style.left = data.statsX; statsEl.style.top = data.statsY; }
        if (data.vehicleX) { vehicleEl.style.bottom = 'auto'; vehicleEl.style.right = 'auto'; vehicleEl.style.left = data.vehicleX; vehicleEl.style.top = data.vehicleY; }
        if (data.minimapX) {
            minimapAnchorEl.style.left = data.minimapX;
            minimapAnchorEl.style.top = data.minimapY;

            fetch(`https://${GetParentResourceName()}/updateLiveMinimap`, {
                method: "POST",
                headers: {
                    "Content-Type":"application/json"
                },
                body: JSON.stringify({
                    x: minimapAnchorEl.offsetLeft / window.innerWidth,
                    y: minimapAnchorEl.offsetTop / window.innerHeight
                })
            });
        }
    }
});