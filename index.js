
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
  rm
} = require("fs");
const path = require("path");

const {build, buildString} = require("./babel/core");
const { injectScript, getReference } = require("./dom");
const printError = require("./exceptions");
const { writeError, isDevMode } = require("./utils");

var ELECTRON_DIRNAME; // <-- path

var Tasks = [];

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
          const code = `
          var printError = require("electron-jsx/exceptions");
          try{
            ${transpile}
            printError(null);
          }catch(e){
            printError(e.toString(), "${src.replace(/\\/g,"\\\\")}");
          }`;
          if(isDevMode()){
            injectScript(document.head, code);
          }else{
            var reference = getReference(document);
            injectScript(reference.head, code);
          }
        }).catch(e => (isDevMode()) ? printError(e, src) : console.error(e));
      }else writeError(err);
    })
  }
}

/**
* Event handler when file changes,rename,delete or create
* @param {String} mainFolder main folder path
* @param {String} secondFolder folder contains transpiled files
* @param {String} event changeEvent
* @param {String} name name of relative path
*/
function render(mainFolder, secondFolder, event, name){
  function clearProcess(id){
    Tasks = Tasks.filter(value => value !== id);
  }
  
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
      if(!err) load(); else{
        writeError(err);
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
    else copyFile(input, output, (err) => {
      clearProcess(name);
      if(!err) load(); else writeError(err);
    })
  }

  if(event === "add_or_rename"){
    stat(output, (err) => {
      if(err) sync(path.join(input, ".."), path.join(output, ".."), {watch: false}, (event, name) => {
        render(path.join(input, ".."), path.join(output, ".."), event, name);
      })
      else render(input, output, "add", name);
    })

    if(event === "remove"){
      rm(output, (err) => writeError(err));
    }
  }
}