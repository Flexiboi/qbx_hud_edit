local config = require 'config.client'
local speedMultiplier = config.useMPH and 2.23694 or 3.6
local cruiseOn = false
local showSeatbelt = false
local playerState = LocalPlayer.state
local stress = playerState.stress or 0
local hunger = playerState.hunger or 100
local thirst = playerState.thirst or 100
local hp = 100
local armed = false
local oxygen = 100
local playerDead = false
local w = 0
local hasWeapon = false
local OutMap = config.outMap

RegisterNetEvent('QBCore:Client:OnPlayerLoaded', function()
    Wait(2000)
    stress = QBX.PlayerData.metadata.stress
    hunger = QBX.PlayerData.metadata.hunger
    thirst = QBX.PlayerData.metadata.thirst
    hp = QBX.PlayerData.metadata.health
    SendNUIMessage({
        action = 'addCustomStats',
        assets = config.customHudStats
    })
    TriggerEvent('hud:client:LoadMap')
end)

-- AddEventHandler("onResourceStart", function(resourceName)
-- 	if (GetCurrentResourceName() == resourceName) then
-- 		TriggerEvent('hud:client:LoadMap')
-- 	end
-- end)

RegisterNUICallback('showOutMap', function(_, cb)
    Wait(50)
    OutMap = not OutMap
    SetResourceKvp('hud_outMap', OutMap)
    DisplayRadar(OutMap)
    cb('ok')
end)

RegisterNetEvent('hud:client:LoadMap', function()
    Wait(50)
    -- Credit to Dalrae for the solve.
    local defaultAspectRatio = 1920 / 1080 -- Don't change this.
    local resolutionX, resolutionY = GetActiveScreenResolution()
    local aspectRatio = resolutionX / resolutionY
    local minimapOffset = 0
    if aspectRatio > defaultAspectRatio then
        minimapOffset = ((defaultAspectRatio-aspectRatio) / 3.6) + .0035
    end
    lib.requestStreamedTextureDict('squaremap')
    SetMinimapClipType(0)
    AddReplaceTexture('platform:/textures/graphics', 'radarmasksm', 'squaremap', 'radarmasksm')
    AddReplaceTexture('platform:/textures/graphics', 'radarmask1g', 'squaremap', 'radarmasksm')
    -- 0.0 = nav symbol and icons left
    -- 0.1638 = nav symbol and icons stretched
    -- 0.216 = nav symbol and icons raised up
    SetMinimapComponentPosition('minimap', 'L', 'B', -0.0100 + minimapOffset, -0.030, 0.180, 0.258)

    -- icons within map
    SetMinimapComponentPosition('minimap_mask', 'L', 'B', 0.200 + minimapOffset, 0.0, 0.065, 0.20)

    -- -0.01 = map pulled left
    -- 0.025 = map raised up
    -- 0.262 = map stretched
    -- 0.315 = map shorten
    SetMinimapComponentPosition('minimap_blur', 'L', 'B', -0.01 + minimapOffset, 0.015, 0.262, 0.300)
    SetBlipAlpha(GetNorthRadarBlip(), 0)
    SetBigmapActive(true, false)
    SetMinimapClipType(0)
    Wait(50)
    SetBigmapActive(false, false)
end)

---@deprecated Use statebags instead
RegisterNetEvent('hud:client:UpdateNeeds', function(newHunger, newThirst) -- Triggered in qb-core
    hunger = newHunger
    thirst = newThirst
end)

AddStateBagChangeHandler('hunger', ('player:%s'):format(cache.serverId), function(_, _, value)
    hunger = value
end)

AddStateBagChangeHandler('thirst', ('player:%s'):format(cache.serverId), function(_, _, value)
    thirst = value
end)

---@deprecated Use statebags instead
RegisterNetEvent('hud:client:UpdateStress', function(newStress)
    stress = newStress
end)

AddStateBagChangeHandler('stress', ('player:%s'):format(cache.serverId), function(_, _, value)
    stress = value
end)

RegisterNetEvent('hud:client:ToggleShowSeatbelt', function()
    showSeatbelt = not showSeatbelt
end)

RegisterNetEvent('seatbelt:client:ToggleCruise', function() -- Triggered in smallresources
    cruiseOn = not cruiseOn
end)

local function isWhitelistedWeaponArmed(weapon)
    if weapon then
        for _, v in pairs(config.weaponsArmedMode) do
            if weapon == v then
                return true
            end
        end
    end
    return false
end

local prevPlayerStats = {nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil}
local function updatePlayerHud(data)
    local shouldUpdate = false
    for k, v in pairs(data) do
        if prevPlayerStats[k] ~= v then
            shouldUpdate = true
            break
        end
    end
    prevPlayerStats = data
    if shouldUpdate then
        SendNUIMessage({
            action = 'hudtick',
            show = data[1],
            health = data[2],
            playerDead = data[3],
            armor = data[4],
            thirst = data[5],
            hunger = data[6],
            stress = data[7],
            voice = data[8],
            talking = data[9],
            oxygen = data[10],
            cruise = data[11],
            seatbelt = data[12],
            hp = data[13],
            speed = data[14],
            engine = data[15],
            gear = data[16],
            maxspeed = data[17],
            rpm = data[18],
            isPaused = data[19],
        })
    end
end

local prevVehicleStats = {nil, nil, nil, nil, nil, nil, nil,}
local function updateVehicleHud(data)
    local shouldUpdate = false
    local invOpen = LocalPlayer.state.invOpen
    for k, v in pairs(data) do
        if prevVehicleStats[k] ~= v then shouldUpdate = true break end
    end
    prevVehicleStats = data
    if shouldUpdate and not invOpen then
        SendNUIMessage({
            action = 'car',
            show = data[1],
            isPaused = data[2],
            seatbelt = data[3],
            speed = data[4],
            fuel = data[5],
            showSeatbelt = data[6],
            engine = data[7],
            gear = data[8],
            maxspeed = data[9],
            rpm = data[10],
        })
    end
end

local lastFuelUpdate = 0
local lastFuelCheck = 0

local function getFuelLevel(vehicle)
    local updateTick = GetGameTimer()
    if (updateTick - lastFuelUpdate) > 2000 then
        lastFuelUpdate = updateTick
        lastFuelCheck = math.floor(GetVehicleFuelLevel(vehicle))
    end
    return lastFuelCheck
end

-- HUD Update loop

CreateThread(function()
    local wasInVehicle = false
    while true do
        Wait(100)
        if LocalPlayer.state.isLoggedIn then
            local show = true
            local weapon = GetSelectedPedWeapon(cache.ped)
            -- Player hud
            if not isWhitelistedWeaponArmed(weapon) then
                if weapon ~= `WEAPON_UNARMED` then
                    armed = true
                else
                    armed = false
                end
            end
            playerDead = IsEntityDead(cache.ped) or QBX.PlayerData.metadata.inlaststand or QBX.PlayerData.metadata.isdead
            parachute = GetPedParachuteState(cache.ped)
            -- Stamina
            if not IsEntityInWater(cache.ped) then
                oxygen = 100 - GetPlayerSprintStaminaRemaining(cache.playerId)
            end
            -- Oxygen
            if IsEntityInWater(cache.ped) then
                oxygen = GetPlayerUnderwaterTimeRemaining(cache.playerId) * 10
            end
            -- Player hud
            local talking = NetworkIsPlayerTalking(cache.playerId)
            local voice = 0
            if LocalPlayer.state.proximity then
                voice = LocalPlayer.state.proximity.distance
                for k, v in pairs(config.voiceVolumes) do
                    if voice <= v then
                        voice = k
                        break
                    end
                end
            end
            if IsPauseMenuActive() then
                show = false
            end
            if not (cache.vehicle and not IsThisModelABicycle(cache.vehicle)) then
            updatePlayerHud({
                show,
                GetEntityHealth(cache.ped) - 100,
                playerDead,
                GetPedArmour(cache.ped),
                thirst,
                hunger,
                stress,
                voice,
                talking,
                oxygen,
                cruiseOn,
                showSeatbelt,
                hp,
                cache.vehicle and math.ceil(GetEntitySpeed(cache.vehicle) * speedMultiplier),
                cache.vehicle and (GetVehicleEngineHealth(cache.vehicle) / 10),
                cache.vehicle and GetVehicleCurrentGear(cache.vehicle),
                cache.vehicle and GetVehicleEstimatedMaxSpeed(cache.vehicle),
                cache.vehicle and GetVehicleCurrentRpm(cache.vehicle),
                IsPauseMenuActive(),
            })
            end
            -- Vehicle hud
            if IsPedInAnyHeli(cache.ped) or IsPedInAnyPlane(cache.ped) then
                showAltitude = true
                showSeatbelt = false
            end
            if cache.vehicle and not IsThisModelABicycle(cache.vehicle) then
                if not wasInVehicle then
                    DisplayRadar(true)
                end
                wasInVehicle = true
                updatePlayerHud({
                    show,
                    GetEntityHealth(cache.ped) - 100,
                    playerDead,
                    GetPedArmour(cache.ped),
                    thirst,
                    hunger,
                    stress,
                    voice,
                    talking,
                    oxygen,
                    cruiseOn,
                    showSeatbelt,
                    hp,
                    cache.vehicle and math.ceil(GetEntitySpeed(cache.vehicle) * speedMultiplier),
                    cache.vehicle and (GetVehicleEngineHealth(cache.vehicle) / 10),
                    cache.vehicle and GetVehicleCurrentGear(cache.vehicle),
                    cache.vehicle and GetVehicleEstimatedMaxSpeed(cache.vehicle),
                    cache.vehicle and GetVehicleCurrentRpm(cache.vehicle),
                    IsPauseMenuActive(),
                })
                updateVehicleHud({
                    show,
                    IsPauseMenuActive(),
                    LocalPlayer.state?.seatbelt,
                    math.ceil(GetEntitySpeed(cache.vehicle) * speedMultiplier),
                    getFuelLevel(cache.vehicle),
                    showSeatbelt,
                    (GetVehicleEngineHealth(cache.vehicle) / 10),
                })
                showSeatbelt = true
            else
                if wasInVehicle then
                    wasInVehicle = false
                    SendNUIMessage({
                        action = 'car',
                        show = false,
                        seatbelt = false,
                        cruise = false,
                    })
                    cruiseOn = false
                end
                DisplayRadar(OutMap)
            end
        else
            SendNUIMessage({
                action = 'hudtick',
                show = false
            })
        end
    end
end)

-- Low fuel
CreateThread(function()
    while true do
        if LocalPlayer.state.isLoggedIn then
            if cache.vehicle and not IsThisModelABicycle(GetEntityModel(cache.vehicle)) then
                if getFuelLevel(cache.vehicle) <= 20 then -- At 20% Fuel Left
                    -- Add pager sound for when fuel is low
                    exports.qbx_core:Notify(locale('notify.low_fuel'), 'error')
                    Wait(60000) -- repeats every 1 min until empty
                end
            end
        end
        Wait(10000)
    end
end)

-- Stress Gain
if config.stress.enableStress then
    CreateThread(function() -- Speeding
        while true do
            if LocalPlayer.state.isLoggedIn then
                if cache.vehicle then
                    local vehClass = GetVehicleClass(cache.vehicle)
                    local speed = GetEntitySpeed(cache.vehicle) * speedMultiplier

                    if vehClass ~= 13 and vehClass ~= 14 and vehClass ~= 15 and vehClass ~= 16 and vehClass ~= 21 then
                        local stressSpeed
                        if vehClass == 8 then
                            stressSpeed = config.stress.minForSpeeding
                        else
                            stressSpeed = LocalPlayer.state?.seatbelt and config.stress.minForSpeeding or config.stress.minForSpeedingUnbuckled
                        end
                        if speed >= stressSpeed then
                            TriggerServerEvent('hud:server:GainStress', math.random(1, 3))
                        end
                    end
                end
            end
            Wait(10000)
        end
    end)
end

local function isWhitelistedWeaponStress(weapon)
    if weapon then
        for _, v in pairs(config.stress.whitelistedWeapons) do
            if weapon == v then
                return true
            end
        end
    end
    return false
end

local function startWeaponStressThread(weapon)
    if isWhitelistedWeaponStress(weapon) then return end
    hasWeapon = true

    CreateThread(function()
        while hasWeapon do
            if IsPedShooting(cache.ped) then
                if math.random() <= config.stress.chance then
                    TriggerServerEvent('hud:server:GainStress', math.random(1, 5))
                end
            end
            Wait(0)
        end
    end)
end

AddEventHandler('ox_inventory:currentWeapon', function(currentWeapon)
    hasWeapon = false
    Wait(0)

    if not currentWeapon then return end

    startWeaponStressThread(currentWeapon.hash)
end)

-- Stress Screen Effects

local function getBlurIntensity(stresslevel)
    for _, v in pairs(config.stress.blurIntensity) do
        if stresslevel >= v.min and stresslevel <= v.max then
            return v.intensity
        end
    end
    return 1500
end

local function getEffectInterval(stresslevel)
    for _, v in pairs(config.stress.effectInterval) do
        if stresslevel >= v.min and stresslevel <= v.max then
            return v.timeout
        end
    end
    return 60000
end

CreateThread(function()
    while true do
        local effectInterval = getEffectInterval(stress)
        if stress >= 100 then
            local blurIntensity = getBlurIntensity(stress)
            local fallRepeat = math.random(2, 4)
            local ragdollTimeout = fallRepeat * 1750
            TriggerScreenblurFadeIn(1000.0)
            Wait(blurIntensity)
            TriggerScreenblurFadeOut(1000.0)

            if not IsPedRagdoll(cache.ped) and IsPedOnFoot(cache.ped) and not IsPedSwimming(cache.ped) then
                local forwardVector = GetEntityForwardVector(cache.ped)
                SetPedToRagdollWithFall(cache.ped, ragdollTimeout, ragdollTimeout, 1, forwardVector.x, forwardVector.y, forwardVector.z, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0)
            end

            Wait(1000)
            for _ = 1, fallRepeat, 1 do
                Wait(750)
                DoScreenFadeOut(200)
                Wait(1000)
                DoScreenFadeIn(200)
                TriggerScreenblurFadeIn(1000.0)
                Wait(blurIntensity)
                TriggerScreenblurFadeOut(1000.0)
            end
        elseif stress >= config.stress.minForShaking then
            local blurIntensity = getBlurIntensity(stress)
            TriggerScreenblurFadeIn(1000.0)
            Wait(blurIntensity)
            TriggerScreenblurFadeOut(1000.0)
        end
        Wait(effectInterval)
    end
end)

-- Compass
local prevBaseplateStats = {nil, nil, nil, nil, nil, nil, nil}

local function updateBaseplateHud(data)
    local shouldUpdate = false
    for k, v in pairs(data) do
        if prevBaseplateStats[k] ~= v then shouldUpdate = true break end
    end
    prevBaseplateStats = data
    if shouldUpdate then
        SendNUIMessage ({
            action = 'streetnames',
            show = data[1],
            street1 = data[2],
            street2 = data[3],
        })
    end
end

local lastCrossroadUpdate = 0
local lastCrossroadCheck = {}

local function getCrossroads(player)
    local updateTick = GetGameTimer()
    if updateTick - lastCrossroadUpdate > 1500 then
        local pos = GetEntityCoords(player)
        local street1, street2 = GetStreetNameAtCoord(pos.x, pos.y, pos.z)
        lastCrossroadUpdate = updateTick
        lastCrossroadCheck = {GetStreetNameFromHashKey(street1), GetStreetNameFromHashKey(street2)}
    end
    return lastCrossroadCheck
end

-- Compass Update loop

CreateThread(function()
	local lastHeading = 1
    local heading
	while true do
        Wait(50)
        local show = true
        local camRot = GetGameplayCamRot(0)
        heading = qbx.math.round(360.0 - ((camRot.z + 360.0) % 360.0))
		if heading == 360 then heading = 0 end
        if heading ~= lastHeading then
            if cache.vehicle then
                local crossroads = getCrossroads(cache.ped)
                SendNUIMessage ({
                    action = 'compass',
                    value = heading
                })
                updateBaseplateHud({
                    show,
                    crossroads[1],
                    crossroads[2],
                })
            else
                if OutMap then
                    local crossroads = getCrossroads(cache.ped)
                    SendNUIMessage ({
                        action = 'compass',
                        value = heading
                    })
                    updateBaseplateHud({
                        show,
                        crossroads[1],
                        crossroads[2],
                    })
                else
                    SendNUIMessage ({
                        action = 'streetnames',
                        show = false,
                    })
                end
            end
        end
        lastHeading = heading
    end
end)

RegisterNetEvent('qbx_hud:client:showHud', function()
    if cache.vehicle then
        DisplayRadar(true)
        updateVehicleHud({
            true,
            IsPauseMenuActive(),
            LocalPlayer.state?.seatbelt,
            math.ceil(GetEntitySpeed(cache.vehicle) * speedMultiplier),
            getFuelLevel(cache.vehicle),
            showSeatbelt,
            cache.vehicle and (GetVehicleEngineHealth(cache.vehicle) / 10),
            cache.vehicle and GetVehicleCurrentGear(cache.vehicle),
            cache.vehicle and GetVehicleEstimatedMaxSpeed(cache.vehicle),
            cache.vehicle and GetVehicleCurrentRpm(cache.vehicle),
        })
    end
end)

RegisterNetEvent('qbx_hud:client:hideHud', function()
    if cache.vehicle then
        DisplayRadar(false)
        SendNUIMessage({
            action = 'car',
            show = false,
        })
    end
end)

RegisterNetEvent('Hud:Client:UpdateHudStats', function(id, value)
    SendNUIMessage({
        action = 'updateCustomStat',
        id = id,
        value = value
    })
end)

RegisterNetEvent('Hud:Client:RemoveCustomStat', function(name)
    SendNUIMessage({
        action = 'removeCustomStat',
        statname = name
    })
end)


-- Set hud height
-- @param height number: The new height of the hud in vh (1-100)
-- @param type string: "stats", "car", or nil for both
RegisterNetEvent('Hud:Client:SetHudHeight', function(height, type)
    SendNUIMessage({
        action = 'setHudHeight',
        height = height,
        type = type
    })
end)

-- Reset hud height
-- @param type string: "stats", "car", or nil for both
RegisterNetEvent('Hud:Client:ResetHudHeight', function(type)
    SendNUIMessage({
        action = 'resetHudHeight',
        type = type
    })
end)