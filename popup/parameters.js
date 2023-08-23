import {domready, wait} from "./utilities.js"

let originalParams

domready().then(()=>{
    customElements.define('responsive-input',class extends HTMLElement{
        constructor(){
            super()
            this.attachShadow({mode:'open'}).appendChild(document.querySelector('#responsive-input-template').content.cloneNode(true))
            this.editCallback=this.editCallback.bind(this)
            this.focusInCallback=this.focusInCallback.bind(this)
            this.focusOutCallback=this.focusOutCallback.bind(this)
            this.keyDownCallback=this.keyDownCallback.bind(this)

            this.span=this.shadowRoot.querySelector('span')
            this.input=this.shadowRoot.querySelector('input')
            this.resizeObserver=new ResizeObserver(entries=>{
                for(let entry of entries){
                    // console.log([entry.contentBoxSize.inlineSize,this.shadowRoot.activeElement==this.input])
                    if(this.value.length){
                        if(this.shadowRoot.activeElement==this.input){
                            let extraSpace=parseFloat(getComputedStyle(this.input).fontSize)*2
                            if(this.input.offsetWidth<this.span.offsetWidth+extraSpace){
                                this.input.style.width=this.span.offsetWidth+extraSpace+'px'
                            }
                        }else{
                            this.input.style.width=this.span.offsetWidth+'px'
                        }
                    }else if(this.shadowRoot.activeElement!=this.input){
                        this.input.style.width=''
                    }
                }
            })
        }
        get value(){
            return this.input.value
        }
        set value(value){
            this.input.value=value
            this.span.textContent=value
        }
        static get observedAttributes() { return ['value'] }
        attributeChangedCallback(name, oldValue, newValue) {
            if (name == 'value') {
                this.value=newValue
            }
        }
        focusInCallback(){
            if(this.value.length){
                let extraSpace=parseFloat(getComputedStyle(this.input).fontSize)*2
                if(this.input.offsetWidth<this.span.offsetWidth+extraSpace){
                    this.input.style.width=this.span.offsetWidth+extraSpace+'px'
                }
            }else{
                this.input.style.width=''
            }
        }
        focusOutCallback(){
            if(this.value.length){
                this.input.style.width=this.span.offsetWidth+'px'
            }else{
                this.input.style.width=''
            }
        }
        editCallback(){
            this.span.textContent=this.value
        }
        keyDownCallback(e){
            if(e.keyCode=='13'){
                this.dispatchEvent(new CustomEvent('enterkeydown',{
                    bubbles:true,
                    composed:true
                }))
            }
        }
        connectedCallback(){
            this.resizeObserver.observe(this.span)
            this.input.addEventListener('focusin',this.focusInCallback)
            this.input.addEventListener('focusout',this.focusOutCallback)
            this.input.addEventListener('input',this.editCallback)
            this.input.addEventListener('keydown',this.keyDownCallback)
        }
        disconnectedCallback(){
            this.resizeObserver.disconnect()
            this.input.removeEventListener('focusin',this.focusInCallback)
            this.input.removeEventListener('focusout',this.focusOutCallback)
            this.input.removeEventListener('input',this.editCallback)
            this.input.removeEventListener('keydown',this.keyDownCallback)
        }
    })

    customElements.define('param-input',class extends HTMLElement{
        constructor(){
            super()
            this.delete=this.delete.bind(this)
            this.attachShadow({mode:'open'}).appendChild(document.querySelector('#param-input-template').content.cloneNode(true))
            customElements.upgrade(this.shadowRoot)
        }
        get field(){
            return this.shadowRoot.querySelector('responsive-input[name=field]').value
        }
        set field(value){
            this.shadowRoot.querySelector('responsive-input[name=field]').value=value
        }
        get value(){
            return this.shadowRoot.querySelector('responsive-input[name=value]').value
        }
        set value(value){
            this.shadowRoot.querySelector('responsive-input[name=value]').value=value
        }
        connectedCallback(){
            this.shadowRoot.querySelector('button').addEventListener('click',this.delete)
        }
        disconnectedCallback(){
            this.shadowRoot.querySelector('button').removeEventListener('click',this.delete)
        }
        delete(){
            this.dispatchEvent(new CustomEvent('delete',{
                bubbles:true,
                composed:true,
                detail:{ deleted: Promise.resolve().then(()=>this.remove()) }
            }))
        }
    })
})

function paramsAreDifferent(){
    let paramElements=[...document.querySelectorAll('param-input')].filter(param=>param.field)
    if([...originalParams].length==paramElements.length){
        for (let paramElement of paramElements){
            if(!originalParams.getAll(paramElement.field).some(value=>value==paramElement.value))
                return true
        }
        return false
    }else{
        return true
    }
}

function setSubmitStatus(options){
    if(options.highlight){
        document.querySelector('form [type=submit]').classList.add('highlighted')
    }else{
        document.querySelector('form [type=submit]').classList.remove('highlighted')
    }
}

function adjustParams(){
    let last=document.querySelector('section.params>param-input:last-of-type')
    if(!last || last.field){
        let paramInput=document.createElement('param-input')
        paramInput.style.width=0
        paramInput.style.height=0
        paramInput.style.padding=0
        paramInput.style.margin=0
        paramInput.style.opacity=0
        paramInput.style.overflow='hidden'
        document.querySelector('section.params').appendChild(paramInput)
        wait(200).then(()=>{
            paramInput.removeAttribute('style')
            paramInput.animate([{
                opacity:0
            },{
                opacity:1
            }],{
                duration:500
            })
        })
    }else{
        while(last.previousElementSibling && !last.previousElementSibling.field){
            let temp=last
            last=last.previousElementSibling
            temp.delete()
        }
    }
    setSubmitStatus({highlight:paramsAreDifferent()})
}

Promise.all([
    browser.tabs.query({active:true,currentWindow:true}),
    domready()
]).then(values=>{
    let params=document.querySelector('section.params')
    let url=new URL(values[0][0].url)
    originalParams=url.searchParams
    originalParams.forEach((value,key)=>{
        let paramElement=document.createElement('param-input')
        paramElement.field=key
        paramElement.value=value
        params.appendChild(paramElement)
    })

    params.insertAdjacentHTML('beforeend','<param-input></param-input>')

    params.addEventListener('input',e=>{
        adjustParams()
        let responsiveInput=e.composedPath()[2]
        if(responsiveInput.tagName=='RESPONSIVE-INPUT' && responsiveInput.getAttribute('name')=='field'){
            let param=e.target
            browser.storage.local.get(param.field).then(result=>{
                if(result && !param.value)
                    for(let key in result){
                        param.value=result[key]
                    }
            })
        }
    })

    params.addEventListener('delete',e=>{
        e.detail.deleted.then(()=>{
            adjustParams()
        })
    })

    const submit=()=>{
        let newUrl=new URL(url.pathname,url.origin)
        for (let paramElement of document.querySelectorAll('param-input')){
            if (paramElement.field){
                let pair={}
                pair[paramElement.field]=paramElement.value
                browser.storage.local.set(pair)
                newUrl.searchParams.append(paramElement.field,paramElement.value)
            }
        }
        browser.tabs.update({url:newUrl.href})
        document.querySelector('form').classList.add('submitting')
    }

    document.querySelector('form').addEventListener('enterkeydown',e=>{
        // console.log(e)
        submit()
    })

    document.querySelector('form').addEventListener('submit',e=>{
        e.preventDefault()
        submit()
        // window.close()
    })
})

browser.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
    // console.log([tabId,changeInfo,tab])
    if(changeInfo.status=='loading'){
        window.close()
    }
})

browser.tabs.onActivated.addListener(function(){
    window.close()
})
