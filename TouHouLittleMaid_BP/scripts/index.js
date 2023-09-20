import { world, system, Enchantment, ItemEnchantsComponent } from "@minecraft/server"
import { altarStructure } from "./altar/AltarStructureHelper";
import experiment from "./experiment"
import PowerPoint from "./entities/power_point"
import * as Danmaku from "./danmaku/DanmakuManager"
import * as Tool from"./libs/scarletToolKit";

if(true){
    // World Initialize
    world.afterEvents.worldInitialize.subscribe((e) => {
        PowerPoint.init_scoreboard_world();
        PowerPoint.init_dynamic_properties(e);
        Danmaku.init_dynamic_properties(e);
    });

    system.runTimeout(()=>{
        thlm.main();
    },100)
}
else{
    experiment.main();
}

class thlm {
    static main(){
        world.afterEvents.playerSpawn.subscribe(event => {
            if(event.initialSpawn){
                // say something
                // event.player.sendMessage({translate: ""})
            }
            
        });
        // Before Item Use On
        var on_use_player = {};
        world.beforeEvents.itemUseOn.subscribe(event => {
            system.run(()=>{
                // Tool.testBlockInfo(source.dimension, blockLocation);
                if (event.source.typeId == "minecraft:player") {
                    let player = event.source;
                    if(!on_use_player[player.name]){
                        on_use_player[player.name] = true;
                        system.runTimeout(function () {
                            delete on_use_player[player.name];
                        }, 10);
                        // Activate Altar  (Interact with red wool by touhou_little_maid:hakurei_gohei_xxx)
                        if(event.itemStack.typeId.substring(0, 32) == "touhou_little_maid:hakurei_gohei"){
                            if(player.isSneaking){
                                Danmaku.gohei_transform(event);
                            }
                            else if(event.block.typeId == "minecraft:red_wool"){
                                altarStructure.activate(player.dimension, event.block.location, event.blockFace);
                            }
                        }
        
                        // Place or Pop Item  (Interact with touhou_little_maid:altar_platform_block)
                        if(event.block.typeId == "touhou_little_maid:altar_platform_block" && !player.isSneaking){
                            altarStructure.placeItemEvent(event.block.location, player);
                        }
                    }
                }
            });
        });

        // Item Events
        world.beforeEvents.itemDefinitionEvent.subscribe(event => {
            system.run(()=>{
                if(event.eventName.substring(0, 5) == "thlm:"){
                    switch(event.eventName.substring(5)){
                        // hakurei gohei transform
                        case "hgt":
                            Danmaku.gohei_transform(event);
                            break;
                        // hakurei gohei activate - hakurei gohei (crafting table) transform to true gohei
                        case "hga":
                            Danmaku.gohei_activate(event);
                            break;
                        default:
                            break;
                    }
                }
            })
        });

        // Entity Events
        world.beforeEvents.dataDrivenEntityTriggerEvent.subscribe(event => {
            system.run(()=>{
                // Tool.logger(event.id)
                // const {entity, id, modifiers} = data;
                if(event.id.substring(0, 5) == "thlm:"){
                    switch(event.id.substring(5)){
                        // at: altar_tick
                        case "at": 
                            altarStructure.deactivateEvent(event.entity); 
                            // altarStructure.refreshItemsEvent(entity); // TODO: Reduce execution frequency
                            break;
                        // af: altar_refresh
                        case "af":
                            altarStructure.refreshItemsEvent(event.entity)
                            break;
                        // ppi: power_point_init
                        case "ppi":
                            PowerPoint.init_power_point(event.entity);
                            break;
                        // pps: power point scan (powerpoint)
                        case "pps":
                            PowerPoint.scan_powerpoint(event.entity);
                            break;
                        // pfd; power point - fairy death
                        case  "pfd":
                            PowerPoint.fairy_death(event.entity);
                            break;
                        // dfg: danmaku - fairy shoot
                        case "dfs":
                            Danmaku.fairy_shoot(event.entity);
                            break;
                        case "ddb":
                            Danmaku.debug_shoot(event.entity);
                            break;
                        default: break;
                    }
                } 
            });
        });

        // Projectile Hit Event
        world.afterEvents.projectileHit.subscribe(event =>{
            system.run(()=>{
                try{
                    var projectile = event.projectile;
                    if(projectile != undefined){
                        var typeId = event.projectile.typeId;
                        if(typeId != undefined){
                            if(typeId.substring(0, 6) == "thlmd:"){
                                Danmaku.danmakuHitEvent(event);
                            }
                            else if(typeId == "touhou_little_maid:power_point"){
                                PowerPoint.powerpoint_hit(projectile, event.dimension);
                            }
                        }
                    }
                }
                catch{}
            });
        });

        system.runInterval(()=>{
            PowerPoint.scan_tick();
        }, 5);
    }
}