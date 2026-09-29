const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../sync-model.js');
const food=(id,kcal=100)=>({id,type:'food',kcal,p:10,f:3,c:8,createdAt:10});
test('independent edits merge by immutable entry ID, with totals and no duplicates',()=>{
    const a={updatedAt:100,log:[food('shared'),food('phone')]},b={updatedAt:200,log:[food('shared'),food('laptop',200)]};
    const ab=M.mergeDay(a,b);assert.equal(ab.log.length,3);assert.equal(ab.consumedCalories,400);
    assert.deepEqual(ab,M.mergeDay(b,a));assert.deepEqual(ab,M.mergeDay(ab,ab));
});
test('deletion survives stale devices and changes to unrelated entries',()=>{
    const a={updatedAt:300,log:[food('keep')],deletedEntries:{gone:300}};
    const b={updatedAt:400,log:[food('gone'),food('new')]};
    const merged=M.mergeDay(a,b);assert.deepEqual(merged.log.map(x=>x.id).sort(),['keep','new']);
    assert.equal(merged.deletedEntries.gone,300);
});
test('legacy numeric IDs retain their type so nutrition confirmation signatures remain valid',()=>{
    assert.equal(M.mergeDay({log:[food(123)]},{}).log[0].id,123);
});
test('profile fields travel with the latest profile revision and a blank profile cannot erase one',()=>{
    const a={profile:{weight:77,updatedAt:100},baseKcal:2000},b={profile:{weight:75,updatedAt:200},baseKcal:1900};
    assert.equal(M.mergeSnapshot(a,b).profile.weight,75);assert.equal(M.mergeSnapshot(b,a).baseKcal,1900);
    assert.equal(M.mergeSnapshot(a,{profile:{}}).profile.weight,77);
});
test('favorites merge equal-size sets and preserve explicit removal',()=>{
    assert.deepEqual(M.mergeFavorites({favWorkouts:['A']},{favWorkouts:['B']}).favWorkouts,['A','B']);
    const state=M.mergeFavorites({favWorkouts:['A']},{workoutFavoriteState:{A:{active:false,updatedAt:20}}});
    assert.deepEqual(state.favWorkouts,[]);assert.equal(state.workoutFavoriteState.A.active,false);
});
