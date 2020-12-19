const {
    stat,
    readdir,
    mkdir,
    copyFile,
    rmdir,
    watch,
    access,
  } = require("fs");
const path = require("path");

/**
* Return changes in folder or file
* @callback changeCallback
* @param {String} changeEvent - "remove", "add", "add_or_rename", "change"
* @param {string} relativePath - relativePath of folder/file 
*/

/**
* Actions when the file is synchronized
* @param {String} main Main path to be sync
* @param {String} copy Path to be a copy of main
* @param {{watch: Boolean, base: String}}
* @param {changeCallback} addonActions Actions when the file is synchronized
*/
function sync(main, copy, {watch, base}, addonActions){
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
                            const relativePath = (!base) ? file : path.join(base, file);
                            sync(dir, path.join(copy, file), {watch: false, base: relativePath}, addonActions);
                        })
                        }
                        else{
                            const relativePath = base ? base : ".";
                          copyFile(dir, path.join(copy, file), () => {
                            addonActions("add", path.join(relativePath,file));
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

/** deletes cache for specific module */
function clearAllCache(globalPath=".") {
    readdir(globalPath, {encoding: "utf-8"}, (err, files) => {
        if(!err){
            for(const file of files){
                stat(path.join(globalPath, file), (err, stats) => {
                    if(!err){
                        if(stats.isDirectory()){
                            clearAllCache(path.join(globalPath, file));
                        }else{
                            try{
                                delete require.cache[require.resolve(path.join(globalPath, file))];
                            }catch{

                            }
                        }
                    }   
                })
            }
        }
    })
}

module.exports = {sync, write, writeError, isDevMode, clearAllCache};