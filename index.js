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
  watchFile,
  readdir,
  mkdir,
  copyFile,
  unlink,
  readFile,
  rmdir,
  watch,
  access,
  rename,
  rm,
  read
} = require("fs");
const path = require("path");
const babel = require("@babel/core");
const {promisify} = require("util");
const {reportBuildError} = require("react-error-overlay");

const {writeCssHandler, manageImport, manageCssImport} = require("./babel/transformers");
const {getReactDOM, getCssImports} = require("./babel/parsers");

const config = require("./config.json");
const { sync } = require("./test");

const readFileAsync = promisify(readFile);
const writeFileAsync = promisify(writeFile);
const readDirAsync = promisify(readdir);

var ELECTRON_DIRNAME;

// var for dynamics config of babel custom css plugin:

let componentCssName = "ElectronJSXCSS";
let componentCssSource;
const addOn = {
  presets: [],
  plugins: []
}

/** Write in the console
 * @param {String} text
 */
function write(text) {
  process.stdout.write(`\x1b[36melectron-jsx:\x1b[37m ${text.toString()}\n`);
}

/** Write error in the console
 * @param {String} text
 */
function writeError(text) {
  process.stderr.write(`\x1b[41m[ERROR]\x1b[40m \x1b[36melectron-jsx:\x1b[37m ${text.toString()}\n`);
}

/** Return True if is a dev mode */
function isDevMode() {
  return (process.env.NODE_ENV && process.env.NODE_ENV != "production" || process.env.ELECTRON_IS_DEV);
}

/**
 * Transpiler in real time for Electron React Apps file-based
 * @param {String} dirname 
 * @param {{reactDir: String}} param1 
 */
module.exports = function (dirname, { reactDir }) {
  write(`Starting in ${isDevMode() ? "development" : "production"} mode`);
  const reactBuilds = path.join(dirname, "./react-builds");
  sync(path.join(dirname, reactDir), reactBuilds, isDevMode(), (event, name) => {
    render(reactBuilds, event, name);
  });
  sync(path.join(__dirname, ".jsx"), path.join(__dirname, "./builds"), false, (event, name) => {
    render(path.join(__dirname, "./builds"), event, name);
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
        buildString(data, true).then(data => {
          scriptDom.innerText = `
            try{
              ${data}
            }catch(e){
              var {reportRuntimeError} = require("react-error-overlay");
              reportRuntimeError(e);
            }`
        }).catch(e => reportBuildError(e));
      }else writeError(err);
    })
  }
}


/**
 * Event handler when file changes,rename,delete or create
 * @param {String} reactBuilds react builds path
 * @param {String} event changeEvent
 * @param {String} name name of relative path
 */
function render(reactBuilds, event, name){
  const isReact = name.endsWith(".jsx");
  const isScript = name.endsWith(".js") || isReact;
  const isAddOrChange = (event === "add" || event === "change");
  const isFolder = name.endsWith("\\");
  if(event === "change" && !isFolder) write(`${(isScript) ? "Building" : "Copying"} ${name} ...`);
  if(isReact){
    rename(path.join(reactBuilds, name), path.join(reactBuilds, name.replace(".js",".jsx")), (err) => {
      if(!err){
        if(isAddOrChange) build(path.join(folder, name), path.join(reactBuilds, name)).then(ok => { if(ok) load() });
      }else writeError(err);
    });
  } else if(isScript && isAddOrChange){
    build(path.join(folder, name), path.join(reactBuilds, name)).then(ok => { if(ok) load() });;
  } else if (isAddOrChange){
    copyFile(path.join(folder, name), path.join(reactBuilds, name), (err) => {
      if(!err) reload(); else writeError(err);
    });
  }

  if(!isAddOrChange){
    access(path.join(folder, name), (err) => {
      if(err){
        // rename
        if(isFolder) sync(path.join(folder, name), path.join(reactBuilds, name), false, (event, name) => { render(reactBuilds, event, name); });
        else rm(path.join(folder, name));
      } else {
        // add
        render(reactBuilds, "add", name);
      }
  })
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
                     copyFile(dir, path.join(copy, file), () => {
                       addonActions("add", path.join(copy, file));
                     })
                   }
                 }else write(err, true);
               })
             }
           }else write(err, true);
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
  }).code;
  code = await babel.transformAsync(code, {
    presets: ["@babel/preset-react"],
    plugins: ["@babel/plugin-transform-modules-commonjs"],
  }).code;
  return code;
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
  }catch(e){
    reportBuildError(e.toString());
    return false;
  }
}



