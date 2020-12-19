const config = require("./config.json");

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