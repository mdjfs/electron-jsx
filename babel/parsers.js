const babel = require("@babel/core");
const path = require("path");

/** Get reactDOM var name
 * @param {String} code - code to parse
 */
async function getReactDOM(code){
    var reactDOM = null;
    var node = await babel.parseAsync(code, { plugins: ["@babel/plugin-syntax-jsx"] });
    for(var element of node.program.body){
      if(babel.types.isImportDeclaration(element)){
        const value = element.source.value;
        if(value === "react-dom" )
          for (var specifier of element.specifiers) {
            if (babel.types.isImportDefaultSpecifier(specifier)) 
              reactDOM = specifier.local.name;
        }
      }
    }
    return reactDOM;
  }

/** Get all CSS links in a file
 * @param {String} code - code to parse
 * @param {String} basePath - set a base path to relative link
 */
  async function getCssImports(code, basePath){
      var links = [];
      var node = await babel.parseAsync(code, { plugins: ["@babel/plugin-syntax-jsx"] });
      for(var element of node.program.body){
          if(babel.types.isImportDeclaration(element)){
            const value = element.source.value;
            if(value[0] === "." && value.endsWith(".css")) links.push(path.join(path.dirname(basePath), value));
          }
      }
      return links;
  }

  module.exports = {getReactDOM, getCssImports};

  