local config = require 'config.server'

AddEventHandler('ox_inventory:openedInventory', function(source)
    TriggerClientEvent('qbx_hud:client:hideHud', source)
end)

AddEventHandler('ox_inventory:closedInventory', function(source)
    TriggerClientEvent('qbx_hud:client:showHud', source)
end)

local function updatePlayerStress(src, player, amount, isGain)
    if not player then return end
    if config.stress.disableForLEO and player.PlayerData.job.type == 'leo' then return end

    local currentStress = player.PlayerData.metadata.stress or 0
    local newStress = isGain and math.min(100, currentStress + amount) or math.max(0, currentStress - amount)

    player.Functions.SetMetaData('stress', newStress)
    TriggerClientEvent('hud:client:UpdateStress', src, newStress)

    local notifyKey = isGain and 'notify.stress_gain' or 'notify.stress_removed'
    local iconColor = isGain and '#C53030' or '#0F52BA'

    exports.qbx_core:Notify(src, locale(notifyKey), 'inform', 2500, nil, nil, { '#141517', '#ffffff' }, 'brain', iconColor)
end

RegisterNetEvent('hud:server:GainStress', function(amount)
    updatePlayerStress(source, exports.qbx_core:GetPlayer(source), amount, true)
end)

RegisterNetEvent('hud:server:RelieveStress', function(amount)
    updatePlayerStress(source, exports.qbx_core:GetPlayer(source), amount, false)
end)