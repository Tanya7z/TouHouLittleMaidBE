import { world, system, Enchantment, ItemEnchantsComponent } from "@minecraft/server"
import { altarStructure } from "./src/altar/AltarStructureHelper";
import experiment from "./experiment"
import PowerPoint from "./src/altar/PowerPoint"
import * as Danmaku from "./src/danmaku/DanmakuManager"
import { CustomSpellCardManger } from "./src/danmaku/CustomSpellCardManger";
import * as Tool from"./src/libs/scarletToolKit";
import { itemShootManager } from "./src/danmaku/ItemShootManager";
import { MaidManager } from "./src/maid/MaidManager";
import { ConfigHelper } from "./src/controller/Config";
import { MaidSkin } from "./src/maid/MaidSkin";
import { EntityMaid } from "./src/maid/EntityMaid";
import { GoldMicrowaver } from "./src/blocks/GoldMicrowaver";

import { CommandManager } from './src/controller/Command'

if(true){
    // World Initialize
    world.afterEvents.worldInitialize.subscribe((e) => {
        system.run(()=>{
            ConfigHelper.init();
            PowerPoint.init_scoreboard_world();

            PowerPoint.init_dynamic_properties(e);
            Danmaku.init_dynamic_properties(e);
            EntityMaid.initDynamicProperties(e);
            
            MaidManager.init();
            MaidSkin.initScoreboard();
            
        });
    });

    system.runTimeout(()=>{
        thlm.main();
    }, 20);
}
else{
    Tool.logger("§e[Touhou Little Maid] 现在是实验模式。")
    experiment.main();
}
world.sendMessage("§e[Touhou Little Maid] Addon Loaded!");
class thlm {
    static main(){
        if(false){
            // 伤害统计
            var total = 0;
            var count = 0;
            var max = 0;
            var min = 999;
            var start = 0; // ms
            world.afterEvents.entityHurt.subscribe(event => {
                //// 伤害信息 ////
                let source = event.damageSource.damagingEntity;
                if(source===undefined) source = "?"
                else source = source.typeId
                Tool.logger(` ${source} -> ${event.hurtEntity.typeId}: ${event.damage.toFixed(2)}`);

                //// 伤害统计 ////
                if(event.damage<0)return; // 排除治疗
                count++;
                total+=event.damage;

                // 平均
                let time = new Date().getTime();  
                let average1 = total/count; // 每次伤害
                let average2 = 0; // dps
                if(start===0){
                    start = time;
                }
                else{
                    average2 = total/(time-start)*1000;
                }
                // 极值
                max = Math.max(max, event.damage);
                min = Math.min(min, event.damage);
                Tool.logger(` Hit: ${count.toFixed(2)} | MIN: ${min.toFixed(2)} | MAX:${max.toFixed(2)} | DPH :${average1.toFixed(2)} | DPS: ${average2.toFixed(2)}`)

                
        });
        }
        
        //// Player ////
        // Script Event
        system.afterEvents.scriptEventReceive.subscribe(event => {
            system.run(()=>{
                CommandManager.scriptEvent(event);
            })
        }, {namespaces: ["thlm"]});

        // Player spawn
        world.afterEvents.playerSpawn.subscribe(event => {
            // 进服事件
            if(event.initialSpawn){
                let player = event.player;
                player.sendMessage({rawtext:[
                    {"translate": "message.tlm.player_join1"},{"text": "\n"},
                    {"translate": "message.tlm.player_join2"}
                ]});
                // 首次进服事件
                if(PowerPoint.test_power_number(player.name) === false){
                    let playerName = Tool.playerCMDName(player.name);
                    // 初始化p点计分板
                    PowerPoint.set_power_number(player.name, 0);
                    // 给书
                    player.dimension.runCommand(`give ${playerName} touhou_little_maid:memorizable_gensokyo_1 1`);
                    player.dimension.runCommand(`give ${playerName} touhou_little_maid:memorizable_gensokyo_2 1`);
                    // 给魂符
                    player.dimension.runCommand(`give ${playerName} touhou_little_maid:smart_slab_has_maid 1`);
                    // say something
                    // event.player.sendMessage({translate: ""})
                }
            }            
        });

        //// Item ////
        // Before Use On
        var on_use_player = {}; // 使用冷却
        world.beforeEvents.itemUseOn.subscribe(event => {
            system.run(()=>{
                const block     = event.block;
                const player    = event.source;
                const itemStack = event.itemStack;
                
                if(!on_use_player[player.name]){// 带冷却事件
                    on_use_player[player.name] = true;
                    system.runTimeout(()=>{delete on_use_player[player.name];}, 10);
                    
                    //// 方块筛选 ////
                    if(block.typeId.substring(0, 18) === "touhou_little_maid"){
                        let blockName = block.typeId.substring(19);
                        
                        switch(blockName){
                            //// 祭坛平台交互 ////
                            case "altar_platform_block":{
                                if(!player.isSneaking){
                                    altarStructure.placeItemEvent(event.block.location, player);
                                    event.cancel = true;
                                    return;
                                }
                            }; break;
                            //// 黄金微波炉 ////
                            case "gold_microwaver":{
                                GoldMicrowaver.interactEvent(event);
                            }; break;
                            default: break;
                        }
                    };

                    //// 物品筛选 ////
                    if(itemStack.typeId.substring(0, 18) === "touhou_little_maid"){
                        let itemName = itemStack.typeId.substring(19);
                        switch(itemName){
                            // case "gold_microwaver_item": GoldMicrowaver.placeEvent(event); break;
                            case "photo": MaidManager.photoOnUseEvent(event); break;
                            case "smart_slab_has_maid": MaidManager.smartSlabOnUseEvent(event); break;
                            default:{
                                //// 御币使用事件 ////
                                if(itemName.substring(0,13) === "hakurei_gohei"){
                                    if(player.isSneaking) Danmaku.gohei_transform(event); // 切换弹种
                                    else if(block.typeId == "minecraft:red_wool")         // 祭坛激活
                                        altarStructure.activate(player.dimension, event.block.location, event.blockFace);
                                }
                            }; break;
                        }
                    }
                }
            });
        });

        // Trigger Event
        world.beforeEvents.itemDefinitionEvent.subscribe(event => {
            system.run(()=>{
                if(event.eventName.substring(0, 5) == "thlm:"){
                    switch(event.eventName.substring(5)){
                        // hakurei gohei transform
                        case "hgt": Danmaku.gohei_transform(event); break;
                        // hakurei gohei activate - hakurei gohei (crafting table) transform to true gohei
                        case "hga": Danmaku.gohei_activate(event); break;
                        // spell card
                        case "sc":  CustomSpellCardManger.onSpellCardUseEvent(event); break;
                        // item shoot
                        case "is":  itemShootManager.itemShootEvent(event); break;
                        // // ph: photo
                        // case "ph":  MaidManager.photoOnUseEvent(event); break;
                        // // ss: smart slab
                        // case "ss":  MaidManager.smartSlabOnUseEvent(event); break;
                        default: break;
                    }
                }
            })
        });

        //// Entity ////
        // Trigger Event
        world.beforeEvents.dataDrivenEntityTriggerEvent.subscribe(event => {
            system.run(()=>{
                // Tool.logger(event.id)
                // const {entity, id, modifiers} = data;
                if(event.id.substring(0, 4) == "thlm"){
                    switch(event.id.substring(4, 5)){
                        // 通用事件前缀
                        case ":":
                            switch(event.id.substring(5)){
                                // at: altar_tick
                                case "at" : altarStructure.deactivateEvent(event.entity); break;
                                // af: altar_refresh
                                case "af" : altarStructure.refreshItemsEvent(event.entity); break;
                                // ppi: power_point_init
                                case "ppi": PowerPoint.init_power_point(event.entity); break;
                                // pps: power point scan (powerpoint)
                                case "pps": PowerPoint.scan_powerpoint(event.entity); break;
                                // pfd; power point - fairy death
                                case "pfd": PowerPoint.fairy_death(event.entity); break;
                                // dfg: danmaku - fairy shoot
                                case "dfs": Danmaku.fairy_shoot(event.entity); break;
                                // ddb: danmaku debug shoot
                                case "ddb": Danmaku.debug_shoot(event.entity); break;
                                // b: box open
                                case "b"  : MaidManager.boxOpenEvent(event); break;
                                // n: NPC
                                case "n": MaidManager.NPCInteract(event); break;
                                default: break;
                            }; break;
                        // 女仆专用事件
                        case "m":
                            switch(event.id.substring(6, 7)){
                                case "a": MaidManager.danmakuAttack(event);       break; // a Danmaku Attack
                                case "d": MaidManager.onDeathEvent(event);        break; // d Death
                                case "f": MaidManager.onTameFollowSuccess(event); break; // f Follow on tamed
                                case "h": MaidManager.returnHomeEvent(event);     break; // h Home
                                case "i": MaidManager.inventoryModeEvent(event);  break; // i Inventory mode
                                case "l": MaidManager.setLevelEvent(event);       break; // l Level
                                case "m": MaidManager.onInteractEvent(event);     break; // m Master interact
                                case "n": MaidManager.onNPCEvent(event);          break; // n NPC
                                case "p": MaidManager.onPhotoEvent(event);        break; // p Photo
                                case "s": MaidManager.sitModeEvent(event);        break; // s Sit mode
                                case "t": MaidManager.timerEvent(event);          break; // t Timer
                                case "0": MaidManager.onSpawnEvent(event);        break; // 0 Spawn
                                case "1": MaidManager.onSmartSlabRecycleEvent(event); break;// 1 Smart slab
                                default: break;
                            }
                            break;
                        // 女仆背包专用事件
                        case "b":
                            switch(event.id.substring(6)){
                                // g: grave
                                case "g" : MaidManager.graveAttackEvent(event); break;
                                // t0: type 0 (default)
                                case "t0" : MaidManager.backpackTypeChangeEvent(event, 0); break;
                                // t1: type 1 (small)
                                case "t1" : MaidManager.backpackTypeChangeEvent(event, 1); break;
                                // t2: type 2 (middle)
                                case "t2" : MaidManager.backpackTypeChangeEvent(event, 2); break;
                                // t3: type 3 (big)
                                case "t3" : MaidManager.backpackTypeChangeEvent(event, 3); break;
                            }
                            break;
                        case "w":
                            switch(event.id.substring(6, 7)){
                                case "d" : GoldMicrowaver.despawnEvent(event); break; // d Despawn
                                case "f" : GoldMicrowaver.finishEvent(event); break; // f finish
                                case "i" : GoldMicrowaver.interactEventNoItem(event); break;// i interact(NO Item, Not Sneaking)
                                case "s" : GoldMicrowaver.interactEventNoItemSneaking(event); break;// i interact(NO Item, Sneaking)
                                default: break;
                            }
                            break;
                        default:
                            break;
                    }
                    
                } 
            });
        });
        // Death Event
        world.afterEvents.entityDie.subscribe(event =>{
            let killer = event.damageSource.damagingEntity
            if(killer !== undefined){
                if(killer.typeId === "thlmm:maid"){
                    MaidManager.killEvent(event);
                }
            }
        });
        
        //// Block ////
        // Place
        world.afterEvents.playerPlaceBlock.subscribe(event=>{
            let block = event.block;
            if(block.typeId.substring(0, 18) === "touhou_little_maid"){
                let blockName = block.typeId.substring(19);
                switch(blockName){
                    //// 祭坛平台交互 //// ? 这个干什么的
                    case "altar_platform_block":{
                        if(!player.isSneaking) altarStructure.placeItemEvent(event.block.location, player);
                    }; break;
                    default: break;
                }
            };
        });
        
        //// Projectile ////
        // Hit Block
        world.afterEvents.projectileHitBlock.subscribe(event=>{
            system.run(()=>{
                var projectile = event.projectile;
                if(projectile !== undefined){
                    // 弹幕可能正在释放，无法获取typeId
                    try{
                        var typeId = event.projectile.typeId;
                        if(typeId !== undefined){
                            if(typeId.substring(0, 6) == "thlmd:"){
                                Danmaku.danmakuHitBlockEvent(event);
                            }
                            else if(typeId == "touhou_little_maid:power_point"){
                                PowerPoint.powerpoint_hit(projectile, event.dimension);
                            }
                        }
                    }
                    catch{}
                }
            });
        });
        // Hit Entity
        world.afterEvents.projectileHitEntity.subscribe(event =>{
            system.run(()=>{
                var projectile = event.projectile;
                if(projectile !== undefined){
                    // 弹幕可能正在释放，无法获取typeId
                    try{
                        var typeId = event.projectile.typeId;
                        if(typeId !== undefined){
                            if(typeId.substring(0, 6) == "thlmd:"){
                                Danmaku.danmakuHitEntityEvent(event);
                            }
                            else if(typeId == "touhou_little_maid:power_point"){
                                PowerPoint.powerpoint_hit(projectile, event.dimension);
                            }
                        }
                    }
                    catch{}
                }
            });
        });
        // Power Point Scan
        system.runInterval(()=>{ PowerPoint.scan_tick(); }, 10);
    }
}