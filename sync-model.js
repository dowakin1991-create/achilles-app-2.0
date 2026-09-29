/* Pure reconciliation used by local reads and atomic Firestore writes. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AchillesSyncModel=api;})(typeof window==='object'?window:globalThis,function(){
    'use strict';
    const time=x=>Number(x?.updatedAt||x?.createdAt||0)||0;
    const newest=(a,b)=>!a?b:!b?a:time(a)>time(b)?a:time(b)>time(a)?b:JSON.stringify(a)>JSON.stringify(b)?a:b;
    function entryKey(entry,index=0){
        if(entry?.id!==undefined&&entry.id!==null)return String(entry.id);
        const text=JSON.stringify(entry);let hash=2166136261;
        for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619);
        return `legacy-${(hash>>>0).toString(16)}-${index}`;
    }
    function mergeDay(a={},b={}){
        const deletedEntries={};
        for(const source of [a.deletedEntries,b.deletedEntries])for(const [id,at]of Object.entries(source||{}))deletedEntries[id]=Math.max(Number(at)||0,deletedEntries[id]||0);
        const entries=new Map();
        for(const day of [a,b])for(const [index,raw]of (day.log||[]).entries()){
            const id=entryKey(raw,index),entry={...raw,id:raw.id??id};
            if(deletedEntries[id])continue; // Immutable IDs; deleted records never resurrect.
            entries.set(id,newest(entries.get(id),entry));
        }
        const log=[...entries.values()].sort((x,y)=>(Number(x.createdAt||x.id)||0)-(Number(y.createdAt||y.id)||0)||String(x.id).localeCompare(String(y.id)));
        const day={...newest(a,b),log,deletedEntries,updatedAt:Math.max(time(a),time(b)),consumedCalories:0,workoutBonus:0,macros:{p:0,f:0,c:0}};
        for(const e of log){if(e.type==='food'){day.consumedCalories+=Number(e.kcal)||0;for(const k of ['p','f','c'])day.macros[k]+=Number(e[k])||0;}else if(e.type==='workout')day.workoutBonus+=Number(e.burned)||0;}
        return day;
    }
    function mergeDays(a={},b={}){return Object.fromEntries([...new Set([...Object.keys(a),...Object.keys(b)])].map(date=>[date,mergeDay(a[date],b[date])]));}
    function favoriteState(list=[],state={}){const out={...state};for(const name of list)if(!out[name])out[name]={active:true,updatedAt:0};return out;}
    function mergeFavorites(a={},b={}){
        const state={};for(const source of [favoriteState(a.favWorkouts,a.workoutFavoriteState),favoriteState(b.favWorkouts,b.workoutFavoriteState)])for(const[name,value]of Object.entries(source))state[name]=newest(state[name],value);
        return {workoutFavoriteState:state,favWorkouts:Object.keys(state).filter(k=>state[k].active).sort()};
    }
    function mergeWeights(a=[],b=[]){const out=new Map();for(const item of [...a,...b])if(item?.date)out.set(item.date,newest(out.get(item.date),item));return [...out.values()].sort((x,y)=>x.date.localeCompare(y.date));}
    function mergeSnapshot(a={},b={}){
        const winner=!Object.keys(b.profile||{}).length?a:!Object.keys(a.profile||{}).length?b:newest({updatedAt:a.profileUpdatedAt||time(a.profile),value:a},{updatedAt:b.profileUpdatedAt||time(b.profile),value:b}).value;
        const out={...a,...b,...mergeFavorites(a,b),allDaysData:mergeDays(a.allDaysData,b.allDaysData),weightHistory:mergeWeights(a.weightHistory,b.weightHistory)};
        for(const field of ['profile','profileUpdatedAt','appMode','baseKcal','goalText','targetMacros'])if(winner[field]!==undefined)out[field]=winner[field];
        return out;
    }
    return {entryKey,mergeDay,mergeDays,mergeFavorites,mergeWeights,mergeSnapshot,newest};
});
