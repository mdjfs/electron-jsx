
/**
 * MIT License
 *
 * Creator: Marcos Fuenmayor
 *
 * If you want be a collaborator, please contact me ! email: marcos.fuenmayorhtc@gmail.com
 */

const {
  stat,
  copyFile,
  readFile,
  rename,
  rmdir,
  unlink,
  mkdir
} = require("fs");
const path = require("path");

const {build, buildString} = require("./babel/core");
const { injectScript, makeReference, getIframe, injectScriptIntoIframe } = require("./dom");
const printError = require("./exceptions");
const { writeError, isDevMode, write, sync, requireUncached} = require("./utils");
const config = require("./config.json");

var ELECTRON_DIRNAME; // <-- path

var Tasks = [];

/**
* Transpiler in real time for Electron React Apps file-based
* @param {String} dirname 
* @param {{reactDir: String}} param1 
*/
module.exports = function (dirname, { reactDir }) {
  write(`Starting in ${isDevMode() ? "development" : "production"} mode${isDevMode() ? "" : ". No reloads."}`);
  const reactBuilds = path.join(dirname, "./react-builds");
  sync(path.join(dirname, reactDir), reactBuilds, { watch:isDevMode()} , (event, name) => {
      render(path.join(dirname, reactDir), reactBuilds, event, name);
  });
  sync(path.join(__dirname, "./jsx"), path.join(__dirname, "./builds"), {watch: false}, (event, name) => {
      render(path.join(__dirname, "./jsx"), path.join(__dirname, "./builds"), event, name, true);
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
        buildString(data, "./react-builds").then(transpile => {
          const code = `
          var printError = require("electron-jsx/exceptions");
          try{
            ${transpile}
            printError(null);
          }catch(e){
            printError(e.toString());
          }`;
          if(isDevMode()){
            injectScriptIntoIframe(code);
          }else{
            injectScript(document.head, code);
          }
        }).catch(e => (isDevMode()) ? printError(e, src) : console.error(e));
      }else writeError(err);
    })
  }
}

function reload(module){
  requireUncached(module);
  load();
}

/**
* Event handler when file changes,rename,delete or create
* @param {String} mainFolder main folder path
* @param {String} secondFolder folder contains transpiled files
* @param {String} event changeEvent
* @param {String} name name of relative path
* @param {Boolean} isInternal if is internal then not print erros in electron app
*/
function render(mainFolder, secondFolder, event, name, isInternal=false){
  const input = path.join(mainFolder, name);
  const output = path.join(secondFolder, name);
  const isReact = name.endsWith(".jsx");
  const isScript = name.endsWith(".js");
  const isChange = (event === "change")
  const isAdd = (event === "add");
  const isCalled = Tasks.includes(name);
  let clearProcess = (id) => {
    Tasks = Tasks.filter(value => value !== id);
  }

  let scriptHandler = (input, output) => {
    build(input, output, (err) => {
      clearProcess(name);
      if(!err && !isInternal) reload(path.join(secondFolder, name.replace(".jsx",".js"))); else if(err){
        writeError(err);
        if(isDevMode() && !isInternal)
          printError(err, input);
      }
    });
  }

  Tasks.push(name);

  if(isChange && !isCalled){
    write(`${(isScript || isReact) ? "Building" : "Copying"} ${name} ...`);
  }
  if((isAdd || isChange) && !isCalled){
    if(isReact){
      rename(output, output.replace(".jsx",".js"), _ => {
        scriptHandler(input, output.replace(".jsx",".js"));
      })
    } else if(isScript) scriptHandler(input, output)
    else{
      stat(output, (err, stat) => {
        if(!err){
          if(stat.isDirectory()){
            mkdir(output, {recursive: true}, (_err) => {
              clearProcess(name);
            })
          }else{
            copyFile(input, output, (err) => {
              clearProcess(name);
              if(!err) reload(path.join(secondFolder, name)); else writeError(err);
            })
          }
        }
      })
    }
  }

  
  if(event === "remove"){
    var removeOutput = output;
    if(isReact) removeOutput = removeOutput.replace(".jsx",".js");
    stat(removeOutput, (err, stat) => {
      if(!err){
        if(stat.isDirectory()){
          rmdir(removeOutput, (err) => {
            if(err) writeError(err);
            clearProcess(name);
          })
        }
        else{
          unlink(removeOutput, (err) => {
            if(err) writeError(err);
            clearProcess(name);
          })
        }
      }else writeError(err);
    })
  }

  if(event === "add_or_rename" && !isCalled){
    stat(output, (err) => {
      if(err) // rename
      sync(path.join(input, ".."), path.join(output, ".."), {watch: false}, (event, name) => {
        clearProcess(name);
        render(path.join(input, ".."), path.join(output, ".."), event, name);
      });
      else{ // add
        clearProcess(name);
        render(input, output, "add", name);
      }
    })
  }
}