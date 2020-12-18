
const { writeError } = require("./utils");
const { mkdir, writeFile } = require("fs");
const config = require("./config.json");
const path = require("path");


const CACHE_PATH = path.join(__dirname, config.dom.referencePath, config.dom.referenceName);

/** get Iframe of document
 * @returns {HTMLIFrameElement}
 */
function getIframe(){
    for(const iframe of document.getElementsByTagName("iframe"))
        if(iframe.getAttribute && iframe.getAttribute(config.constants.HTML_DOM_IDENTIFIER) === "true")
            return iframe;
    const iframe = document.createElement("iframe");
    iframe.setAttribute(config.constants.HTML_DOM_IDENTIFIER, "true");
    iframe.style = 'width:100%;height:100%;border:none;position:absolute;';
    document.body.append(iframe);
    return iframe;
}


function writeDOMCache(html, callback){
    mkdir(CACHE_PATH, (_err) => {
        writeFile(CACHE_PATH, `<html>${html}</html>`, callback)
   });
}



/** get a copy of document object
 * @returns {HTMLDocument}
 */
function getMirror(){

    let purge = (nodes) => {
        for(var node of nodes){
            for(var element of node.childNodes){
                if(element.hasAttribute && element.hasAttribute(config.constants.HTML_DOM_IDENTIFIER)){
                    element.remove();
                } else if (element instanceof HTMLScriptElement){
                    if(element.text.includes("require('electron-jsx')")||element.text.includes('require("electron-jsx")')){
                        element.remove();
                    }
                }
            }
        }
    }

    const mirror = document.cloneNode(true);
    
    purge([mirror.body, mirror.head]);

    return mirror;
}

/**
 * Inject code into iframe only with dev purposes
 * @param {*} code 
 */
function injectScriptIntoIframe(code){
    document.body.style = '';
    const iframe = getIframe();
    const mirror = getMirror();
    injectScript(mirror.head, `
    window.loadScripts = () => {
        ${code}
    }`);
    const contexts = mirror.getElementsByTagName("html");
    const text = contexts[contexts.length-1].innerHTML;
    writeDOMCache(text, (err) => {
            if (!err){
                iframe.onload = () => {
                    iframe.contentWindow.require = window.require;
                    iframe.contentWindow.loadScripts();
                    document.body.style = 'margin:0px;padding:0px;';
                }
                iframe.src = path.join(__dirname, config.dom.referencePath, config.dom.referenceName);
            }else writeError(err);
        }
    )
}


/** inject script in a head DOM element
 * @param {HTMLHeadElement} head
 * @param {String} code
 */
function injectScript(head, code){
    for(var element of head.childNodes)
        if(element.getAttribute && element.getAttribute(config.constants.HTML_DOM_IDENTIFIER))
            element.remove();
    var script = document.createElement("script");
    script.text = code;
    script.setAttribute(config.constants.HTML_DOM_IDENTIFIER, "true");
    head.append(script);
}

module.exports = {injectScriptIntoIframe, injectScript};