const fs=require('fs'),path=require('path');
const {JSDOM,VirtualConsole}=require('jsdom');
const ROOT=path.resolve(__dirname,'../..');
async function boot(seed={},firestore=null){
 const errors=[],messages=[];
 const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));vc.on('error',(...a)=>messages.push(a.map(String).join(' ')));
 const dom=new JSDOM(fs.readFileSync(ROOT+'/index.html','utf8'),{url:'http://audit.local/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.__testFirestore=firestore;
 w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){},addListener(){}});
 w.ResizeObserver=class{observe(){} disconnect(){}};w.IntersectionObserver=class{observe(){} disconnect(){}};
 w.scrollTo=()=>{};w.HTMLElement.prototype.scrollTo=function(){};w.HTMLElement.prototype.scrollIntoView=function(){};
 w.alert=x=>messages.push('alert:'+x);w.confirm=()=>true;w.fetch=async()=>{throw Error('TEST_NETWORK_DISABLED')};
 for(const [k,v]of Object.entries(seed))w.localStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v));
 }});
 for(const script of dom.window.document.scripts){const src=script.getAttribute('src');if(src&&src.startsWith('./')){try{let code=fs.readFileSync(path.join(ROOT,src.split('?')[0]),'utf8');if(src.includes('firebase-sync.js')&&firestore)code=code.replace('try {\n                const [{ initializeApp }', `try {\n                if(window.__testFirestore){({db,doc,setDoc,getDoc,onSnapshot,runTransaction}=window.__testFirestore);return true;}\n                const [{ initializeApp }`);dom.window.eval(code)}catch(e){errors.push(src+': '+e.stack)}}else if(!src){try{dom.window.eval(script.textContent)}catch(e){errors.push(e.stack)}}}
 await new Promise(r=>dom.window.addEventListener('load',r,{once:true}));
 await new Promise(r=>setTimeout(r,150));
 return {dom,w:dom.window,errors,messages};
}
module.exports={boot,ROOT};
if(require.main===module)boot().then(({dom,w,errors,messages})=>{console.log(JSON.stringify({errors,messages,screen:w.document.querySelector('.screen.active-block')?.id,apis:Object.keys(w.Achilles||{})},null,2));dom.window.close()});
