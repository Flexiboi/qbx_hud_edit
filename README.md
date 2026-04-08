# qbx_hud_edit
A simple UI edit for qbox hud
</br>
<img width="3431" height="1426" alt="image" src="https://github.com/user-attachments/assets/b575deca-6397-4a34-a008-09cb8a2e721a" />

</br>
Functionality i got from
</br>
https://github.com/Qbox-project/qbx_hud/tree/main
</br>
Edited the ui and added some functionality
</br>
Ui is self made
</br>
</br>
</br>

**HOW DOES THE UI WORK?**

</br>

- Blinking stat signs below 10% or set in **ui/assets/script.js** at the top
- Number how fast you go turns red if the engine is bad
- Gear text will turn the default color set in **ui/assets/script.js** at the top, when seatbelt is on
- The vehicle rpm meter and fuel bar will turn red when treshhold is hit

</br></br>
**Add custom stats**
</br>
You can add custom stats in the config
</br>
```
customHudStats = {
        [1] = {
            name = 'car',
            icon = 'fa-solid fa-car',
            border = '#00ff00',
            fill = '#2da42d',
        }
    },
```
</br>
</br>

These can be triggerd with
</br>
**TriggerClientEvent("Hud:Client:UpdateHudStats", src, name, value) or TriggerEvent("Hud:Client:UpdateHudStats", name, value)**

</br>

These can be removed with with
</br>
**TriggerClientEvent("Hud:Client:RemoveCustomStat", src, name) or TriggerEvent("Hud:Client:RemoveCustomStat", name)**

</br>
</br>

**Change hud height on the fly for example a phone script**
</br>

- **TriggerClientEvent("Hud:Client:SetHudHeight", src, "stats", val)**
- **TriggerEvent("Hud:Client:SetHudHeight", "stats", val)**
- **TriggerClientEvent("Hud:Client:ResetHudHeight", src, "stats")**
- **TriggerEvent("Hud:Client:ResetHudHeight", "stats")**

**VAL** = height in **VH**
