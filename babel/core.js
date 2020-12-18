const {
    readFile,
    writeFile
  } = require("fs");

const babel = require("@babel/core");

const {manageImport, manageCssImport, writeCssHandler} = require("./transformers");

const {config} = require("../config.json");

/**
*  core of electron-jsx, Transpile script string
* @param {String} code code to be transpiled
* @param {String} baseManagePath resolve local imports with base path
*/
async function buildString(code, baseManagePath=null){
    try{
        var cssImports = await getCssImports(code);
        var nameReactDOM = await getReactDOM(code);
        code = await babel.transformAsync(code, {
            plugins: [
            "@babel/plugin-syntax-jsx",
            (reactBuildImport) ? manageImport(baseManagePath) : {},
            (cssImports.length > 0) ? manageCssImport(config.libraries.cssHandler) : {},
            (cssImports.length > 0) ? writeCssHandler(config.libraries.cssHandler, config.libraries.cssHandlerPath, nameReactDOM) : {}
            ]
        });
        code = code.code;
        code = await babel.transformAsync(code, {
            presets: ["@babel/preset-react"],
            plugins: ["@babel/plugin-transform-modules-commonjs"],
        });
        return code.code;
    }catch(e){
        return e;
    }
}

/**
 * @callback Build
 * @param {Error} err
 */
  
/**
 *  core of electron-jsx, Transpile script files
 * @param {String} inputPath file to be transpiled
 * @param {String} outputPath file contents transpilation
 * @param {Build} callback
 */
function build(inputPath, outputPath, callback){
    readFile(inputPath, {encoding: "utf-8"}, (err, data) => {
        if(err) callback(e);
        else buildString(data)
        .then(code => {
            writeFile(outputPath, code, callback);
        }).catch(callback(e));
    })
}

module.exports = {build, buildString};
  