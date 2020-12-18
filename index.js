
/**
 * MIT License
 *
 * Creator: Marcos Fuenmayor
 *
 * If you want be a collaborator, please contact me ! email: marcos.fuenmayorhtc@gmail.com
 */

const {
  stat,
  writeFile,
  readdir,
  mkdir,
  copyFile,
  readFile,
  rmdir,
  watch,
  access,
  rename,
  rm
} = require("fs");
const path = require("path");
const babel = require("@babel/core");
const {promisify} = require("util");


const {writeCssHandler, manageImport, manageCssImport} = require("./babel/transformers");
const {getReactDOM, getCssImports} = require("./babel/parsers");

const config = require("./config");

const printError = require("./exceptions");

const readFileAsync = promisify(readFile);
const writeFileAsync = promisify(writeFile);

var ELECTRON_DIRNAME; // <-- path

var APP_IFRAME = document.createElement("iframe");

var Tasks = [];

/** Write in the console
* @param {String} text
*/
function write(text) {
process.stdout.write(`\x1b[36melectron-jsx:\x1b[0m ${text.toString()}\n`);
}

/** Write error in the console
* @param {String} text
*/
function writeError(text) {
process.stderr.write(`\x1b[41m[ERROR]\x1b[0m \x1b[36melectron-jsx:\x1b[0m ${text.toString()}\n`);
}


/** Return True if is a dev mode */
function isDevMode() {
  return (process.env.NODE_ENV != "production" || process.env.ELECTRON_IS_DEV);
}

/**
* Transpiler in real time for Electron React Apps file-based
* @param {String} dirname 
* @param {{reactDir: String}} param1 
*/
module.exports = function (dirname, { reactDir }) {
  if(!isDevMode()) write("Starting in production mode, no reloads.");
  const reactBuilds = path.join(dirname, "./react-builds");
  sync(path.join(dirname, reactDir), reactBuilds, isDevMode(), (event, name) => {
      render(path.join(dirname, reactDir), reactBuilds, event, name);
  });
  sync(path.join(__dirname, "./jsx"), path.join(__dirname, "./builds"), false, (event, name) => {
      render(path.join(__dirname, "./jsx"), path.join(__dirname, "./builds"), event, name);
  });
  ELECTRON_DIRNAME = dirname;
  load();
};


/**
* @param {HTMLScriptElement} scriptDom if is not null, the main script is rendered
*/
function load(scriptDom=null){
  if(!scriptDom){ // look for scripts with react-src attribute
    for(const script of document.getElementsByTagName("script")){
      if(script.getAttribute("react-src")) load(script);
    }
  }else{
    const src = path.join(ELECTRON_DIRNAME, scriptDom.getAttribute("react-src"));
    readFile(src, {encoding: "utf-8"}, (err, data) => {
      if(!err){
        buildString(data, true).then(transpile => {
          chargeDynamicScript(`
            var printError = require("electron-jsx/exceptions");
            try{
              ${transpile}
              printError(null);
            }catch(e){
              printError(e.toString(), "${src.replace(/\\/g,"\\\\")}");
            }`);
        }).catch(e => (isDevMode()) ? printError(e, src) : console.error(e));
      }else writeError(err);
    })
  }
}

function chargeDynamicScript(scriptString){
const script = document.createElement("script");
script.setAttribute("electron-jsx-dynamic", "true");
for(const script of document.getElementsByTagName("script")) 
  if(script.getAttribute("electron-jsx-dynamic") === "true") 
  script.remove();
script.text = scriptString;
document.head.append(script);
}

/**
* Event handler when file changes,rename,delete or create
* @param {String} mainFolder main folder path
* @param {String} reactBuilds react builds path
* @param {String} event changeEvent
* @param {String} name name of relative path
*/
function render(mainFolder, reactBuilds, event, name){
  function clearProcess(id){
    Tasks = Tasks.filter(value => value !== id);
  }
  const isReact = name.endsWith(".jsx");
  const isScript = name.endsWith(".js");
  const isChange = (event === "change")
  const isAddOrChange = (event === "add" || isChange);
  const isFolder = !name.includes(".");
  const isCalled = Tasks.includes(name);
  let scriptHandler = (input, output) => {
    write(name);
    write(output);
    build(input, output)
    .then(ok => { if(ok) (isChange) ? window.location.reload() : load() })
    .finally(() => clearProcess(name));
  }
  Tasks.push(name);
  const input = path.join(mainFolder, name);
  const output = path.join(reactBuilds, name);
  if(isChange && !isFolder && !isCalled){
    write(`${(isScript) ? "Building" : "Copying"} ${name} ...`);
  }
  if(isReact){
    const renameOutput = path.join(reactBuilds, name.replace(".jsx",".js"));
    rename(output, renameOutput, (_err) => {
        if(isAddOrChange && !isCalled) 
          scriptHandler(input, renameOutput);
    });
  } else if(isScript && isAddOrChange && !isCalled){
    scriptHandler(input, output);
  } else if (isAddOrChange && !isCalled && !isFolder){
    copyFile(input, output, (err) => {
      clearProcess(name);
      if(!err) (isChange) ? window.location.reload() : load(); else writeError(err);
    });
  } if (isFolder){
    mkdir(output);
  }

  if(!isAddOrChange){
    window.location.reload();
  }
}

/**
* Return changes in folder or file
* @callback changeCallback
* @param {String} changeEvent - "remove", "add", "add_or_rename", "change"
* @param {string} relativePath - relativePath of folder/file 
*/

/**
* Actions when the file is synchronized
* @param {changeCallback} addonActions
* @param {string} relativePath - relativePath of file 
*/
function sync(main, copy, watch=false, addonActions){
  rmdir(copy,{recursive: true}, (_err) => {
          mkdir(copy, (_err) => {
          readdir(main, {encoding: "utf-8"}, (err, files) => {
              if(!err){
              for(const file of files){
                  const dir = path.join(main, file);
                  stat(dir, (err, stats) => {
                  if(!err){
                      if(stats.isDirectory()){
                      mkdir(path.join(copy, file), (_err) => {
                          sync(dir, path.join(copy, file), false, addonActions);
                      })
                      }
                      else{
                        const commonPath =  path.normalize(copy.split("react-builds")[1]);
                        const relativePath = path.join(commonPath, "./", file);
                        copyFile(dir, relativePath, () => {
                          addonActions("add", file);
                        })
                      }
                  }else writeError(err);
                  })
              }
              }else writeError(err);
          })
      })
  })

  if(watch){
      listen(main, addonActions)
  }
}


/**
* Listen folder in mode recursive
* @param {String} folder 
* @param {changeCallback} handler 
*/
function listen(folder, handler){
  watch(folder, {encoding: "utf-8", recursive: true}, (event, name) => {
      access(path.join(folder, name), (err) => {
      let status = (err && err.code === 'ENOENT') ? "remove" : (event === "rename") ? "add_or_rename" : "change";
      handler(status, name);
      })
  })
}

/**
*  core of electron-jsx, Transpile script string
* @param {String} code code to be transpiled
* @param {Boolean} reactBuildImport add "./react-builds" for local imports
*/
async function buildString(code, reactBuildImport=false){
  var cssImports = await getCssImports(code);
  var nameReactDOM = await getReactDOM(code);
  code = await babel.transformAsync(code, {
      plugins: [
      "@babel/plugin-syntax-jsx",
      (reactBuildImport) ? manageImport() : {},
      (cssImports.length > 0) ? manageCssImport(config.libraries.cssHandler) : {},
      (cssImports.length > 0) ? writeCssHandler(config.libraries.cssHandler, cssImports, nameReactDOM) : {}
      ]
  });
  code = code.code;
  code = await babel.transformAsync(code, {
      presets: ["@babel/preset-react"],
      plugins: ["@babel/plugin-transform-modules-commonjs"],
  });
  return code.code;
}

/**
*  core of electron-jsx, Transpile script file
* @param {String} inputPath file to be transpiled
* @param {String} outputPath dir to write file transpiled
*/
async function build(inputPath, outputPath){
  try{
      var code = await readFileAsync(inputPath, {encoding: "utf-8"});
      code = await buildString(code);
      await writeFileAsync(outputPath, code);
      return true;
  }
  catch(e){
      writeError(`${`${e.toString()}
      @filepath: ${inputPath}`}`);
      console.error(`${`${e.toString()}
      @filepath: ${inputPath}`}`);
      if(isDevMode()){
        printError(e, inputPath);
      }
      return false;
  }
}
