// Build-time bridge only: the television never has to parse ES modules.
import {writeFileSync} from 'node:fs';
import {FIXTURE_TYPES} from '../js/fixture-layout.mjs';
import {FINAL_FIXTURE_BAYS,registeredFixtureSlot,fixtureFastenerWindows} from '../js/fixture-skins.mjs';
import {ASSETS} from '../js/assets.mjs';
import {GALLERY_CONFIG} from '../js/config.mjs';
const fixtures={};
for(const [id,f] of Object.entries(FIXTURE_TYPES))fixtures[id]={asset:f.asset,slots:f.slots.map(s=>registeredFixtureSlot({fixtureType:id},s,'final')),fasteners:fixtureFastenerWindows(id,'final')};
const frames={};
for(const [id,f] of Object.entries(ASSETS.frames))frames[id]={asset:'frame-'+id,width:f.width,height:f.height,aperture:f.aperture};
writeFileSync(new URL('../js/tv-layout.js',import.meta.url),'/* Generated from existing read-only gallery registrations. Do not edit slot IDs. */\nwindow.DDGTV_LAYOUT = '+JSON.stringify({endpoint:GALLERY_CONFIG.endpoint,bays:FINAL_FIXTURE_BAYS,fixtures,frames})+';\n');
