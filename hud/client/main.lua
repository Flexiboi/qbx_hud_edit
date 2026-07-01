local config = require 'config.client'
local speedMultiplier = config.useMPH and 2.23694 or 3.6
local showSeatbelt = false
local OutMap = config.outMap
local wasInVehicle = false
local lastPlayerLoggedIn = false
local hudConfig = {
    hideThreshold = (config.hud and config.hud.hideThreshold) or 90,
    blinkThreshold = (config.hud and config.hud.blinkThreshold) or 15,
    colors = config.hudColors or {}
}

-- === MOVE THESE TO THE TOP HERE ===
local customMinimapOffsetX = GetResourceKvpFloat('hud_minimap_offset_x') or 0.0
local customMinimapOffsetY = GetResourceKvpFloat('hud_minimap_offset_y') or 0.0

local minimapOffset = 0
local minimapShifted = false
local minimapShiftY = 0.04
local minimapBasePosition = {
    minimap = { x = -0.0100, y = -0.030, w = 0.180, h = 0.258 },
    minimap_mask = { x = 0.200, y = 0.0, w = 0.065, h = 0.20 },
    minimap_blur = { x = -0.01, y = 0.015, w = 0.262, h = 0.300 },
}

-- The standard GTA V frontend alignment values for a default safezone
local defaultMinimap = {
    x = -0.0045,
    y = 0.002,
    w = 0.150,
    h = 0.188888
}

local function round(value)
    return math.floor(value + 0.5)
end

local function clamp(value, minValue, maxValue)
    return math.min(math.max(value, minValue), maxValue)
end

local uiReady = false
local playerLoaded = false
local hudInitialized = false
local customStatsRegistered = false
local updateHudNow

-- Add this state tracker near the top of your file with your other local variables
local lastRadarState = nil

local function toggleRadar(state)
    if lastRadarState ~= state then
        lastRadarState = state
        DisplayRadar(state)
    end
end

local function setMinimapPosition(shifted, forceUpdate)
    if not forceUpdate and shifted == minimapShifted then return end

    minimapShifted = shifted
    local yOffset = shifted and minimapShiftY or 0.0

    SetMinimapComponentPosition(
        "minimap",
        "L",
        "B",
        minimapBasePosition.minimap.x + minimapOffset + customMinimapOffsetX,
        minimapBasePosition.minimap.y + customMinimapOffsetY + yOffset,
        minimapBasePosition.minimap.w,
        minimapBasePosition.minimap.h
    )

    SetMinimapComponentPosition(
        "minimap_mask",
        "L",
        "B",
        minimapBasePosition.minimap_mask.x + minimapOffset + customMinimapOffsetX,
        minimapBasePosition.minimap_mask.y + customMinimapOffsetY + yOffset,
        minimapBasePosition.minimap_mask.w,
        minimapBasePosition.minimap_mask.h
    )

    SetMinimapComponentPosition(
        "minimap_blur",
        "L",
        "B",
        minimapBasePosition.minimap_blur.x + minimapOffset + customMinimapOffsetX,
        minimapBasePosition.minimap_blur.y + customMinimapOffsetY + yOffset,
        minimapBasePosition.minimap_blur.w,
        minimapBasePosition.minimap_blur.h
    )
end

RegisterNUICallback('saveMinimapPosition', function(data, cb)
    local moveRatioX = data.moveRatioX or 0.0
    local moveRatioY = data.moveRatioY or 0.0

    -- Multiply the movement ratio by the native component sizes
    local newX = defaultMinimap.x + (moveRatioX * defaultMinimap.w)
    local newY = defaultMinimap.y + (moveRatioY * defaultMinimap.h)

    -- Apply the updated positions across all map components simultaneously
    SetMinimapComponentPosition("minimap", "L", "B", newX, newY, defaultMinimap.w, defaultMinimap.h)
    SetMinimapComponentPosition("minimap_mask", "L", "B", newX, newY, defaultMinimap.w, defaultMinimap.h)
    SetMinimapComponentPosition("minimap_blur", "L", "B", newX, newY, defaultMinimap.w, defaultMinimap.h)

    cb('ok')
end)

RegisterNUICallback('updateLiveMinimap', function(data, cb)
    local x = tonumber(data.x) or 0.0
    local y = tonumber(data.y) or 0.0

    customMinimapOffsetX = clamp(x * defaultMinimap.w, -defaultMinimap.w, defaultMinimap.w)
    customMinimapOffsetY = clamp(y * defaultMinimap.h, -defaultMinimap.h, defaultMinimap.h)

    setMinimapPosition(minimapShifted, true)

    cb('ok')
end)

local function loadHudPositions()
    if not uiReady then
        return
    end

    local statsX = GetResourceKvpString('hud_stats_x')
    local statsY = GetResourceKvpString('hud_stats_y')
    local vehicleX = GetResourceKvpString('hud_vehicle_x')
    local vehicleY = GetResourceKvpString('hud_vehicle_y')
    local minimapX = GetResourceKvpString('hud_minimap_x')
    local minimapY = GetResourceKvpString('hud_minimap_y')
    
    customMinimapOffsetX = GetResourceKvpFloat('hud_minimap_offset_x') or 0.0
    customMinimapOffsetY = GetResourceKvpFloat('hud_minimap_offset_y') or 0.0

    SendNUIMessage({
        action = 'loadPositions',
        statsX = statsX,
        statsY = statsY,
        vehicleX = vehicleX,
        vehicleY = vehicleY,
        minimapX = minimapX,
        minimapY = minimapY
    })
    
    TriggerEvent('hud:client:LoadMap')
end

RegisterCommand('hud', function()
    SetNuiFocus(true, true)
    SendNUIMessage({ action = 'openSettings' })
end, false)

RegisterNUICallback('closeSettings', function(_, cb)
    SetNuiFocus(false, false)
    cb('ok')
end)

RegisterNUICallback('saveHudPositions', function(data, cb)
    if data.statsX then SetResourceKvp('hud_stats_x', data.statsX) end
    if data.statsY then SetResourceKvp('hud_stats_y', data.statsY) end
    if data.vehicleX then SetResourceKvp('hud_vehicle_x', data.vehicleX) end
    if data.vehicleY then SetResourceKvp('hud_vehicle_y', data.vehicleY) end
    if data.minimapX then SetResourceKvp('hud_minimap_x', data.minimapX) end
    if data.minimapY then SetResourceKvp('hud_minimap_y', data.minimapY) end
    
    if data.minimapOffsetX ~= nil then 
        customMinimapOffsetX = clamp((tonumber(data.minimapOffsetX) or 0.0) * defaultMinimap.w, -defaultMinimap.w, defaultMinimap.w)
        SetResourceKvpFloat('hud_minimap_offset_x', customMinimapOffsetX)
    end
    if data.minimapOffsetY ~= nil then 
        customMinimapOffsetY = clamp((tonumber(data.minimapOffsetY) or 0.0) * defaultMinimap.h, -defaultMinimap.h, defaultMinimap.h)
        SetResourceKvpFloat('hud_minimap_offset_y', customMinimapOffsetY)
    end

    TriggerEvent('hud:client:LoadMap')
    SetNuiFocus(false, false)
    cb('ok')
end)

RegisterNUICallback('resetHudPositions', function(_, cb)
    DeleteResourceKvp('hud_stats_x')
    DeleteResourceKvp('hud_stats_y')
    DeleteResourceKvp('hud_vehicle_x')
    DeleteResourceKvp('hud_vehicle_y')
    DeleteResourceKvp('hud_minimap_x')
    DeleteResourceKvp('hud_minimap_y')
    DeleteResourceKvp('hud_minimap_offset_x')
    DeleteResourceKvp('hud_minimap_offset_y')

    customMinimapOffsetX = 0.0
    customMinimapOffsetY = 0.0

    TriggerEvent('hud:client:LoadMap')

    -- Close the NUI
    SetNuiFocus(false, false)

    cb('ok')
end)

local function isWhitelistedWeapon(weapon, whitelist)
    if not weapon then return false end
    for _, v in pairs(whitelist) do
        if weapon == v then return true end
    end
    return false
end

local function isVehicle(vehicle)
    return vehicle and not IsThisModelABicycle(GetEntityModel(vehicle))
end

local function isPlayerDead()
    return IsEntityDead(cache.ped) or (QBX.PlayerData and QBX.PlayerData.metadata and (QBX.PlayerData.metadata.inlaststand or QBX.PlayerData.metadata.isdead))
end

local function getVoiceLevel()
    local voice = 0
    if LocalPlayer.state and LocalPlayer.state.proximity then
        voice = LocalPlayer.state.proximity.distance
        for k, v in pairs(config.voiceVolumes) do
            if voice <= v then
                voice = k
                break
            end
        end
    end
    return voice
end

local function getOxygen()
    if IsEntityInWater(cache.ped) then
        return GetPlayerUnderwaterTimeRemaining(cache.playerId) * 10
    end
    return 100 - GetPlayerSprintStaminaRemaining(cache.playerId)
end

local function buildPlayerHudData()
    local show = not IsPauseMenuActive()
    local isPaused = not show
    local oxygen = getOxygen()
    local metadata = QBX.PlayerData and QBX.PlayerData.metadata or {}

    if metadata.hunger ~= nil then
        hunger = metadata.hunger
    end
    if metadata.thirst ~= nil then
        thirst = metadata.thirst
    end
    if metadata.stress ~= nil then
        stress = metadata.stress
    end

    return {
        show,
        GetEntityHealth(cache.ped) - 100,
        isPlayerDead(),
        GetPedArmour(cache.ped),
        thirst,
        hunger,
        stress,
        getVoiceLevel(),
        NetworkIsPlayerTalking(cache.playerId),
        oxygen,
        isPaused,
    }
end

local updatePlayerHud

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

local prevPlayerStats = {}
updatePlayerHud = function(data)
    local shouldUpdate = false
    for i = 1, 11 do
        if prevPlayerStats[i] ~= data[i] then
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
            isPaused = data[11],
        })
    end
end

local prevVehicleStats = {}
local function updateVehicleHud(data)
    local shouldUpdate = false
    local invOpen = LocalPlayer.state and LocalPlayer.state.invOpen or false
    for i = 1, 9 do
        if prevVehicleStats[i] ~= data[i] then
            shouldUpdate = true
            break
        end
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
            rpm = data[9],
        })
    end
end

local function sendHudConfig()
    SendNUIMessage({
        action = 'hudConfig',
        hideThreshold = hudConfig.hideThreshold,
        blinkThreshold = hudConfig.blinkThreshold,
        colors = hudConfig.colors,
    })
end

local function reloadConfig()
    package.loaded['config.client'] = nil
    config = require 'config.client'
    speedMultiplier = config.useMPH and 2.23694 or 3.6
    OutMap = config.outMap
    hudConfig = {
        hideThreshold = (config.hud and config.hud.hideThreshold) or 90,
        blinkThreshold = (config.hud and config.hud.blinkThreshold) or 15,
        colors = config.hudColors or {}
    }
end

local function reloadHudConfig()
    reloadConfig()
    sendHudConfig()
    if uiReady and playerLoaded then
        sendInitialHudUpdates()
    end
end

RegisterCommand('hudreload', function()
    reloadHudConfig()
    print('[HUD] config reloaded')
end, false)

RegisterNetEvent('hud:client:ReloadConfig', function()
    reloadHudConfig()
    print('[HUD] config reloaded via event')
end)

local function sendInitialHudUpdates()
    if not uiReady or not playerLoaded then
        return
    end

    if not customStatsRegistered then
        SendNUIMessage({
            action = 'addCustomStats',
            assets = config.customHudStats
        })
        customStatsRegistered = true
    end
    sendHudConfig()

    if not (LocalPlayer.state and LocalPlayer.state.isLoggedIn) then
        SendNUIMessage({ action = 'hudtick', show = false })
        SendNUIMessage({ action = 'car', show = false })
        return
    end

    updatePlayerHud(buildPlayerHudData())
    if isVehicle(cache.vehicle) then
        updateVehicleHud({
            true,
            IsPauseMenuActive(),
            LocalPlayer.state and LocalPlayer.state.seatbelt or false,
            math.ceil(GetEntitySpeed(cache.vehicle) * speedMultiplier),
            getFuelLevel(cache.vehicle),
            showSeatbelt,
            (GetVehicleEngineHealth(cache.vehicle) / 10),
            GetVehicleCurrentGear(cache.vehicle),
            GetVehicleCurrentRpm(cache.vehicle),
        })
    end
end

local function tryInitHud()
    if not uiReady or not playerLoaded or hudInitialized then
        return
    end
    hudInitialized = true

    if not customStatsRegistered then
        SendNUIMessage({
            action = 'addCustomStats',
            assets = config.customHudStats
        })
        customStatsRegistered = true
    end

    sendHudConfig()
    loadHudPositions()
    sendInitialHudUpdates()
end

local function hudReady()
    uiReady = true
    sendHudConfig()
    tryInitHud()
end

RegisterNUICallback('hudReady', function(_, cb)
    hudReady()
    cb('ok')
end)

local function refreshHudAfterDelay(delay)
    CreateThread(function()
        Wait(delay)
        if LocalPlayer.state and LocalPlayer.state.isLoggedIn then
            sendInitialHudUpdates()
        end
    end)
end

local function onPlayerLoaded()
    Wait(100)
    playerLoaded = true
    local metadata = QBX.PlayerData and QBX.PlayerData.metadata or {}
    stress = metadata.stress or 0
    hunger = metadata.hunger or 100
    thirst = metadata.thirst or 100
    refreshHudAfterDelay(1000)
    TriggerEvent('hud:client:LoadMap')
    sendHudConfig()
end

RegisterNetEvent('QBCore:Client:OnPlayerLoaded', onPlayerLoaded)
RegisterNetEvent('QBX:Client:OnPlayerLoaded', onPlayerLoaded)

AddEventHandler('onResourceStart', function(resourceName)
    if resourceName == GetCurrentResourceName() then
        onPlayerLoaded()
    end
end)

RegisterNUICallback('showOutMap', function(_, cb)
    OutMap = not OutMap
    SetResourceKvp('hud_outMap', OutMap)
    toggleRadar(OutMap)
    cb('ok')
end)

RegisterNUICallback('setMinimapState', function(data, cb)
    local shifted = type(data.shifted) == 'boolean' and data.shifted or false
    setMinimapPosition(not shifted, false)
    cb({ status = 'ok', shifted = not shifted })
end)

RegisterNetEvent('hud:client:LoadMap', function()
    Wait(50)
    local defaultAspectRatio = 1920 / 1080
    local resolutionX, resolutionY = GetActiveScreenResolution()
    local aspectRatio = resolutionX / resolutionY
    minimapOffset = 0
    if aspectRatio > defaultAspectRatio then
        minimapOffset = ((defaultAspectRatio - aspectRatio) / 3.6) + .0035
    end
    lib.requestStreamedTextureDict('squaremap')
    SetMinimapClipType(0)
    AddReplaceTexture('platform:/textures/graphics', 'radarmasksm', 'squaremap', 'radarmasksm')
    AddReplaceTexture('platform:/textures/graphics', 'radarmask1g', 'squaremap', 'radarmasksm')
    
    setMinimapPosition(false, true)    

    SetBlipAlpha(GetNorthRadarBlip(), 0)
    SetBigmapActive(true, false)
    SetMinimapClipType(0)
    Wait(50)
    SetBigmapActive(false, false)
end)

local stress, hunger, thirst = 0, 100, 100
AddStateBagChangeHandler('hunger', ('player:%s'):format(cache.serverId), function(_, _, value)
    hunger = value
    sendInitialHudUpdates()
end)
AddStateBagChangeHandler('thirst', ('player:%s'):format(cache.serverId), function(_, _, value)
    thirst = value
    sendInitialHudUpdates()
end)
AddStateBagChangeHandler('stress', ('player:%s'):format(cache.serverId), function(_, _, value)
    stress = value
    SendNUIMessage({ action = 'updateStress', stress = stress })
    sendInitialHudUpdates()
end)
RegisterNetEvent('hud:client:UpdateStress', function(value)
    stress = value
    SendNUIMessage({ action = 'updateStress', stress = stress })
    sendInitialHudUpdates()
end)

RegisterNetEvent('hud:client:ToggleShowSeatbelt', function()
    showSeatbelt = not showSeatbelt
    sendInitialHudUpdates()
end)

-- === UPDATED MAIN HUD TICK THREAD ===
CreateThread(function()
    while true do
        local waitTime = 1000
        local isLoggedIn = LocalPlayer.state and LocalPlayer.state.isLoggedIn

        if isLoggedIn then
            lastPlayerLoggedIn = true
            local hudData = buildPlayerHudData()
            local inVehicle = isVehicle(cache.vehicle)
            waitTime = inVehicle and 100 or 200

            if not inVehicle then
                if wasInVehicle then
                    wasInVehicle = false
                    prevVehicleStats = {}
                    SendNUIMessage({
                        action = 'car',
                        show = false,
                        seatbelt = false,
                        cruise = false,
                    })
                end
                toggleRadar(OutMap)
                updatePlayerHud(hudData)
            else
                if not wasInVehicle then
                    toggleRadar(true)
                    wasInVehicle = true
                end
                updatePlayerHud(hudData)
                updateVehicleHud({
                    hudData[1],
                    hudData[11],
                    LocalPlayer.state and LocalPlayer.state.seatbelt or false,
                    math.ceil(GetEntitySpeed(cache.vehicle) * speedMultiplier),
                    getFuelLevel(cache.vehicle),
                    showSeatbelt,
                    (GetVehicleEngineHealth(cache.vehicle) / 10),
                    GetVehicleCurrentGear(cache.vehicle),
                    GetVehicleCurrentRpm(cache.vehicle),
                })
                showSeatbelt = true
            end
            
            setMinimapPosition(minimapShifted, true)
        else
            if lastPlayerLoggedIn then
                SendNUIMessage({ action = 'hudtick', show = false })
                lastPlayerLoggedIn = false
            end
        end

        Wait(waitTime)
    end
end)

CreateThread(function()
    while true do
        if LocalPlayer.state and LocalPlayer.state.isLoggedIn then
            if cache.vehicle and not IsThisModelABicycle(GetEntityModel(cache.vehicle)) then
                if getFuelLevel(cache.vehicle) <= 20 then
                    exports.qbx_core:Notify(locale('notify.low_fuel'), 'error')
                    Wait(60000)
                end
            end
        end
        Wait(10000)
    end
end)

if config.stress.enableStress then
    CreateThread(function()
        while true do
            if LocalPlayer.state and LocalPlayer.state.isLoggedIn then
                if cache.vehicle then
                    local vehClass = GetVehicleClass(cache.vehicle)
                    if vehClass ~= 13 and vehClass ~= 14 and vehClass ~= 15 and vehClass ~= 16 and vehClass ~= 21 then
                        local speed = GetEntitySpeed(cache.vehicle) * speedMultiplier
                        local stressSpeed = vehClass == 8 and config.stress.minForSpeeding
                            or ((LocalPlayer.state and LocalPlayer.state.seatbelt) and config.stress.minForSpeeding or config.stress.minForSpeedingUnbuckled)
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

local hasWeapon = false

AddEventHandler('ox_inventory:currentWeapon', function(currentWeapon)
    hasWeapon = false
    if not currentWeapon then return end

    if not isWhitelistedWeapon(currentWeapon.hash, config.stress.whitelistedWeapons) then
        hasWeapon = true
        CreateThread(function()
            while hasWeapon do
                if IsPedShooting(cache.ped) and math.random() <= config.stress.chance then
                    TriggerServerEvent('hud:server:GainStress', math.random(1, 5))
                end
                Wait(100)
            end
        end)
    end
end)

local function getBlurIntensity(stresslevel)
    for _, v in pairs(config.stress.blurIntensity) do
        if stresslevel >= v.min and stresslevel <= v.max then
            return v.intensity
        end
    end
    return 1500
end

local function getEffectInterval(stresslevel)
    for _, v in pairs(config.stress.effectIntervalRange) do
        if stresslevel >= v.min and stresslevel <= v.max then
            return math.random(v.minTimeout, v.maxTimeout)
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
            for _ = 1, fallRepeat do
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

local prevBaseplateStats = {}

local function updateBaseplateHud(data)
    local shouldUpdate = false
    for i = 1, 3 do
        if prevBaseplateStats[i] ~= data[i] then
            shouldUpdate = true
            break
        end
    end
    prevBaseplateStats = data
    if shouldUpdate then
        SendNUIMessage({
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
        lastCrossroadCheck = { GetStreetNameFromHashKey(street1), GetStreetNameFromHashKey(street2) }
    end
    return lastCrossroadCheck
end

CreateThread(function()
    local lastHeading = 1
    while true do
        Wait(100)
        local camRot = GetGameplayCamRot(0)
        local heading = round(360.0 - ((camRot.z + 360.0) % 360.0))
        if heading == 360 then heading = 0 end
        if heading ~= lastHeading then
            if cache.vehicle then
                local crossroads = getCrossroads(cache.ped)
                SendNUIMessage({ action = 'compass', value = heading })
                updateBaseplateHud({ true, crossroads[1], crossroads[2] })
            else
                if OutMap then
                    local crossroads = getCrossroads(cache.ped)
                    SendNUIMessage({ action = 'compass', value = heading })
                    updateBaseplateHud({ true, crossroads[1], crossroads[2] })
                else
                    SendNUIMessage({ action = 'streetnames', show = false })
                end
            end
        end
        lastHeading = heading
    end
end)

RegisterNetEvent('qbx_hud:client:showHud', function()
    if cache.vehicle then
        toggleRadar(true)
        setMinimapPosition(false)
        updateVehicleHud({
            true,
            IsPauseMenuActive(),
            LocalPlayer.state and LocalPlayer.state.seatbelt or false,
            math.ceil(GetEntitySpeed(cache.vehicle) * speedMultiplier),
            getFuelLevel(cache.vehicle),
            showSeatbelt,
            (GetVehicleEngineHealth(cache.vehicle) / 10),
            GetVehicleCurrentGear(cache.vehicle),
            GetVehicleCurrentRpm(cache.vehicle),
        })
    end
end)

RegisterNetEvent('qbx_hud:client:hideHud', function()
    if cache.vehicle then
        toggleRadar(false)
        setMinimapPosition(true)
        SendNUIMessage({ action = 'car', show = false })
    end
end)

RegisterNetEvent('Hud:Client:UpdateHudStats', function(id, value)
    SendNUIMessage({ action = 'updateCustomStat', id = id, value = value })
end)

RegisterNetEvent('Hud:Client:RemoveCustomStat', function(name)
    SendNUIMessage({ action = 'removeCustomStat', statname = name })
end)

RegisterNetEvent('Hud:Client:SetHudHeight', function(height, type)
    SendNUIMessage({ action = 'setHudHeight', height = height, type = type })
end)

RegisterNetEvent('Hud:Client:ResetHudHeight', function(type)
    SendNUIMessage({ action = 'resetHudHeight', type = type })
end)