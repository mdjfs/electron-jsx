const babel = require("@babel/core");
const path = require("path");
const {capitalize} = require("../utils");

/** Manage all imports to consider react-build folder
 * @returns {{visitor:{}}}
 */
function manageImport(){
    return {
        visitor:{
            ImportDeclaration(_path){
                const value = _path.node.source.value;
                const isRelativePath = !path.isAbsolute(value) && value[0] === ".";
                if(isRelativePath) _path.node.source.value = "./" + path.posix.join("react-builds", value);
            }
        }
    }
}

/** Manage all imports to consider css files
 * @param {String} name Name of the handler component
 * @returns {{visitor:{}}}
 */
function manageCssImport(name){
    var isCss = false;
    return {
        visitor: {
            ImportDeclaration(_path){
                const value = _path.node.source.value;
                if(value.endsWith(".css")){
                    if(!isCss){
                        _path.node.source.value = `electron-jsx/builds/${name}`;
                        _path.node.specifiers = [babel.types.importDefaultSpecifier(babel.types.identifier(capitalize(name)))];
                        isCss = true;
                    }
                    else{
                        _path.remove()
                    }
                }
            }
        }
    }   
}

/** add a Css Handler parent for default export / reactDOM render
 * @param {String} name Name of the handler component
 * @param {Array<String>} links links of css files
 * @param {String} reactVar reactDOM name in the scope
 * @returns {{visitor:{}}}
 */
function writeCssHandler(name, links, reactVar){
    return {
        visitor: {
            CallExpression(_path){
                const node = _path.node;
                const isReactRender = (node.callee.object.name === reactVar && node.callee.property.name === "render");
                if(isReactRender){
                    for(var i =0; i<node.arguments.length; i++){
                        if(babel.types.isJSXElement(node.arguments[i])){
                            node.arguments[i] = makeJSXParent(name, links, [node.arguments[i]]);
                        }
                    }
                }
                _path.node = node;
            },
            ExportDefaultDeclaration(_path){
                const node = _path.node;
                if(babel.types.isExpression(node.declaration)){
                    node.declaration = babel.types.functionDeclaration(
                        babel.types.identifier("_default_css_jsx"),
                        [],
                        babel.types.blockStatement([babel.types.returnStatement(makeJSXParent(name, links, [basicJSX(node.declaration.name)]))]),
                        false,
                        false
                      );
                }
                else if(babel.types.isClassDeclaration(node.declaration)){
                    for(var element of node.declaration.body.body){
                        if(babel.types.isClassMethod(element)){
                            if(element.key.name === "render"){
                               for(const methodElement of element.body.body){
                                   if(babel.types.isReturnStatement(methodElement)){
                                       const argument = methodElement.argument;
                                       const children = (babel.types.isExpression(argument)) ? babel.types.jSXExpressionContainer(argument) : argument;
                                       methodElement.argument = makeJSXParent(name, links, [children]);
                                   }
                               }
                            }
                        }
                    }
                }
                else if(babel.types.isFunctionDeclaration(node.declaration)){
                    for(const element of node.declaration.body.body){
                        if(babel.types.isReturnStatement(element)){
                            const argument = element.argument;
                            const children = (babel.types.isExpression(argument)) ? babel.types.jSXExpressionContainer(argument) : argument;
                            element.argument = makeJSXParent(name, links, [children]);
                        }
                    }
                }
                _path.node = node;
            }
        }
    }
}

/** return a basic JSX without attributes or childrens
 * @param {String} name name of JSX
 * @returns {{visitor:{}}}
 */
function basicJSX(name){
    const t = babel.types;
    return t.JSXElement(
        t.JSXOpeningElement(t.JSXIdentifier(name), []),
        t.JSXClosingElement(t.JSXIdentifier(name)),
        [],
        false
      );
}

/**
 * create JSX with link attributes and childrens
 * @param {String} name 
 * @param {Array<String>} links 
 * @param {Array} childrens 
 * @returns {{visitor:{}}}
 */
function makeJSXParent(name, links, childrens) {
    const t = babel.types;
    links = links.map((value) => t.stringLiteral(value));
    const identifier = t.JSXIdentifier(capitalize(name));
    return t.JSXElement(
      t.JSXOpeningElement(identifier, [
        t.JSXAttribute(t.JSXIdentifier("links"), t.jSXExpressionContainer(t.arrayExpression(links)) ),
        t.JSXAttribute(t.JSXIdentifier("path"), t.jSXExpressionContainer(t.identifier("__dirname")))
      ]),
      t.JSXClosingElement(identifier),
      childrens
    );
  };

  module.exports = {writeCssHandler, manageImport, manageCssImport};

  
function capitalize(string){
    return string[0].toUpperCase() + string.substr(1, string.length);
  }