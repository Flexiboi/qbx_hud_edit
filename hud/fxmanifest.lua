fx_version 'cerulean'
game 'gta5'

description 'HUD for Qbox'
version '0.0.1'

ox_lib 'locale'

shared_scripts {
    '@ox_lib/init.lua',
    '@qbx_core/modules/lib.lua',
}

client_scripts {
    '@qbx_core/modules/playerdata.lua',
    'client/main.lua',
}

server_script 'server/main.lua'

ui_page 'ui/index.html'

files {
    'ui/*',
    'ui/index.html',
    'ui/assets/style.css',
    'ui/assets/script.js',
    'locales/*.json',
    'config/client.lua',
}

lua54 'yes'
use_experimental_fxv2_oal 'yes'