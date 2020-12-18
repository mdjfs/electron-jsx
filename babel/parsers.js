const babel = require("@babel/core");

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
 */
  async function getCssImports(code){
      var links = [];
      var node = await babel.parseAsync(code, { plugins: ["@babel/plugin-syntax-jsx"] });
      for(var element of node.program.body){
          if(babel.types.isImportDeclaration(element)){
            const value = element.source.value;
            if(value[0] === "." && value.endsWith(".css")) links.push(value);
          }
      }
      return links;
  }

  module.exports = {getReactDOM, getCssImports};

  