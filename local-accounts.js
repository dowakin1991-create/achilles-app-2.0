/* Preserve offline work across logout and keep local accounts separate. */
(function(root){
    'use strict';
    const prefix='achilles_local_account:';
    const key=user=>prefix+encodeURIComponent(user);
    const activeKeys=()=>Object.keys(localStorage).filter(k=>k.startsWith('achilles_')&&!k.startsWith(prefix));
    const read=user=>{try{return JSON.parse(localStorage.getItem(key(user))||'{}');}catch(_){return {};}};
    function archive(){
        const user=localStorage.getItem('achilles_user');if(!user)return;
        const snapshot=Object.fromEntries(activeKeys().map(k=>[k,localStorage.getItem(k)]));
        localStorage.setItem(key(user),JSON.stringify(snapshot)); // Fail before clearing anything.
    }
    function clear(){for(const k of activeKeys())localStorage.removeItem(k);}
    function activate(user){
        if(localStorage.getItem('achilles_user')===user)return;
        archive();const target=read(user);clear();
        for(const[k,v]of Object.entries(target))localStorage.setItem(k,v);
        localStorage.setItem('achilles_user',user);
        root.allDaysData=JSON.parse(localStorage.getItem('achilles_all_days')||'{}');
        root.dailyLog=[];
        root.currentViewDate=root.todayDate;
    }
    root.AchillesLocalAccounts={archive,activate,read,clear};
})(window);
