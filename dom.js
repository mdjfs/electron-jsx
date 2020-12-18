
const {config} = require("./config.json");

/** get Iframe of document
 * @returns {HTMLIFrameElement}
 */
function getIframe(){
    for(const iframe of document.getElementsByTagName("iframe"))
        if(iframe.getAttribute(config.constants.HTML_DOM_IDENTIFIER) === "true")
            return iframe;
    const iframe = document.createElement("iframe");
    iframe.setAttribute(config.constants.HTML_DOM_IDENTIFIER, "true");
    return iframe;
}

/** get a copy of document object
 * @returns {HTMLDocument}
 */
function getMirror(){
    const mirror = document.cloneNode(true);
    for(var element in mirror) 
        if(element.hasAttribute(config.constants.HTML_DOM_IDENTIFIER))
            element.remove();
    return mirror;
}

/** Make a reference of the document object
 * @returns {HTMLDocument}
 */
function makeReference(){
    const iframe = getIframe();
    iframe.onload = () => {
        iframe.contentWindow.require = window.require;
    }
    iframe.contentDocument = getMirror();
    return iframe.contentDocument;
}

var reference = null;

/** get Actual reference of the document object
 * @returns {HTMLDocument}
 */
function getReference(){
    if(reference) return reference;
    else{
        reference = makeReference();
        return reference;
    }
}

/** inject script in a head DOM element
 * @param {HTMLHeadElement} head
 * @param {String} code
 */
function injectScript(head, code){
    for(var element of head)
        if(element.hasAttribute(config.constants.HTML_DOM_IDENTIFIER))
            element.remove();
    var script = document.createElement("script");
    script.text = code;
    head.append(script);
}

module.exports = {getReference, injectScript};