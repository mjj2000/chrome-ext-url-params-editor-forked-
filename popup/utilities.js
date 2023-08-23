export const wait=(ms,...params)=>new Promise(resolve=>setTimeout(resolve,ms,params))

export const domready=(doc=document)=>new Promise(resolve=>{
    if(doc.readyState!='loading'){
        return resolve()
    }else{
        doc.addEventListener('DOMContentLoaded',()=>resolve())
    }
})


if('chrome' in window && !('browser' in window)){
    window.browser={
        tabs:{...chrome.tabs},
        storage:{...chrome.storage}
    }
    browser.tabs.query=queryInfo=>new Promise(resolve=>chrome.tabs.query(queryInfo,tabs=>resolve(tabs)))
    browser.storage.local={...chrome.storage.local}
    browser.storage.local.get=keys=>new Promise(resolve=>chrome.storage.local.get(keys,result=>resolve(result)))
    browser.storage.local.set=keys=>new Promise(resolve=>chrome.storage.local.set(keys,result=>resolve(result)))
}
