const { stat, writeFile, watchFile, readdir, mkdir, existsSync, copyFile, unwatchFile, mkdirSync, readFile, exists } = require("fs");
const path = require("path");
const babel = require("@babel/core")
const { COPYFILE_EXCL } = require("fs").constants;

const options = {
    presets: ["@babel/preset-react"],
    plugins: ["@babel/plugin-transform-modules-commonjs"]
}

function write(text, err = false) {
    text = (text) ? text.toString() : undefined;
    (err) ? process.stderr.write(`[ERROR] electron-jsx: ${text}\n`) : process.stdout.write(`electron-jsx:  ${text}\n`);
}

function check({ dirs, files }, callback) {
    var anyerr = false;
    var iterable = (dirs) ? dirs : files;
    var method = (dirs) ? "isDirectory" : "isFile";
    var processes = 0;
    for (var path of iterable) {
        stat(path, (err, stat) => {
            if (!anyerr) (err) ? anyerr = true : anyerr = !stat[method]();
            if (err) write(err, true);
            else if (!stat[method]()) write(`electron-jsx: ${path} needs to be a ${method.replace("is", "")} :'(`, true);
            processes++;
            if (processes == iterable.length) callback(anyerr);
        });
    }
}

function mainCheckProcess(dirname, { reactDir }) {
    if (reactDir) {
        check({ dirs: [dirname] }, err => {
            const mainPath = path.join(dirname, reactDir);
            if (!err) check({ dirs: [mainPath] }, err => {
                if (!err) {
                    var buildDir = path.join(dirname, "./react-builds");
                    if(!existsSync(buildDir)) mkdirSync(buildDir);
                    renderDev(buildDir, mainPath);
                }
            })
        });
    }
    else {
        write("Please set 'reactDir' when you call the function :P", true);
    }
}

function renderDev(distDir, reactDir) {
    function renderFolder(folder) {
        var distEq = folder.replace(reactDir, distDir);
        if (!existsSync(distEq)) mkdir(distEq, undefined, (err) => { if (err) write(err, true) });
        readdir(folder, { withFileTypes: true }, (err, data) => {
            if (err) write(err, true)
            else {
                var folders = data.filter((value) => !value.isFile()).map((value) => path.join(folder, value.name));
                for (var searchFolder of folders) renderFolder(searchFolder);
                var files = data.filter((value) => value.isFile()).map((value) => path.join(folder, value.name));
                for (var file of files) {
                    const outputDir = (path.basename(file).includes(".jsx")) ? file.replace(reactDir, distDir).replace(".jsx", ".js") : file.replace(reactDir, distDir) ;
                    const inputDir = file;
                    if (path.basename(inputDir).includes(".jsx")) transformJSX(inputDir, outputDir, { flag: 'w' });
                    else streamFile(inputDir, outputDir, true);
                }
            }
        })
    }
    renderFolder(reactDir);
    var scripts = document.getElementsByTagName("script");
    for(var script of scripts){
        if(script.getAttribute("react-src")){
            var reactSrc = script.getAttribute("react-src");
            script.type = "module";
            script.src = reactSrc.replace(path.basename(path.join(reactSrc,"..")),path.basename(distDir)).replace(".jsx",".js");
        }
    }
}

function streamFile(inputPath, outputPath, replace = true, listen = true) {
    if (replace){
        readFile(inputPath, (err, inputData) => {
            if(err) write(err, true);
            else{
                readFile(outputPath, (err, outputData) => {
                    if(err) copyFile(inputPath, outputPath, (err) => { if (err) write(err, true); else reload(); });
                    else if ( ! (inputData.toString() == outputData.toString())) copyFile(inputPath, outputPath, (err) => { if (err) write(err, true); else reload(); });
                });
            }
        });
    }    
    else copyFile(inputPath, outputPath, COPYFILE_EXCL, (err) => { if(!err) reload(); });
    if(listen) watchFile(inputPath, { interval: 1000 }, _ => { write(`Copying ${path.basename(inputPath)} ... :P`); streamFile(inputPath, outputPath, true, false); });
}

function transformJSX(inputPath, outputPath, writeOptions = { flag: 'wx' }, listen=true) {
    babel.transformFile(inputPath, options, (err, data) => {
        if (err) write(err, true);
        else {
            var cssDir = null;
            data.code = data.code.replace(/require\(("|').[\w,\s-,/]+\.css("|')\)(?:\;?)/g, (value) => {
                cssDir = value.match(/.[\w,\s-,/]+\.css/)[0];
                cssDir = cssDir.replace("./", outputPath.replace(path.basename(outputPath), ""));
                cssDir = cssDir.replace(/\\/g, "\\\\");
                return "";
            });
            data.code = data.code.replace(/require\(("|')[.][/][\w,\s-,/]+("|')\)(?:\;?)/g, (value) => {
                return value.replace(/("|')[.][/][\w,\s-,/]+("|')/, (value) => {
                    return `"${path.join(outputPath, "..", value.replace(/'/g,"").replace(/"/g,"")).replace(/\\/g, "\\\\")}"`
                })
            });
            if(cssDir){
                var filename = path.basename(inputPath).split(".")[0];
                var reactVar = getReactVar(data.code);
                var reactDOMVar = getReactDOMVar(data.code);
                if(reactVar){  
                    data.code = data.code.replace(/exports.default.+=.+_default.+;?/g, (value) => {
                        var varName = value.replace(/exports.default.+=/g,"").replace(/ /g,"").replace(/;/g,"");
                        return `exports.default = () => { return ${reactVar}.default.createElement("div", null, [
                            ${reactVar}.default.createElement("link", {key:"${filename}-css", rel:"stylesheet", type: "text/css", href: "${cssDir}"}),
                            ${reactVar}.default.createElement(${varName}, {key:"${filename}-child"})
                        ]); }`
                    });
                }
                if(reactVar && reactDOMVar){          
                    data.code = data.code.replace(new RegExp(`${reactDOMVar}.default.render[(].+,`, "g"), (value) => {
                        return value.replace(new RegExp(`${reactVar}.default.createElement(.+)`,"g"), (value) => {
                            return `${reactVar}.default.createElement("div", null, [
                                ${reactVar}.default.createElement("link", {key:"${filename}-css", rel:"stylesheet", type: "text/css", href: "${cssDir}"}),
                                ${value.substring(0, value.length-1).replace("null",`{key:"${filename}-child"}`)}
                            ]),`;
                        })
                    })
                }
            }
            readFile(outputPath, (err, fileData) => {
                if(err) writeFile(outputPath, data.code, writeOptions, (err) => { if(!err) reload(); });
                else if( ! (fileData == data.code) ) writeFile(outputPath, data.code, writeOptions, (err) => { if(!err) reload(); });
            });
        }
    });
    if(listen) watchFile(inputPath, { interval: 1000 }, (_) => { write(`Compiling ${path.basename(inputPath)} ... :D`); transformJSX(inputPath, outputPath, { flag: 'w' }, false);  });
}

function getVarName(line){
    return line.match(/(var|const|let).+=/g)[0].replace(/(var|const|let)/g,"").replace(/ /g,"").replace(/=/g,"")
}

function getReactVar(code){
    var reactVar = code.match(/(var|const|let).+=.+require.+("|')react("|').+;?/g);
    return (reactVar) ? getVarName(reactVar[0]) : null;
}

function getReactDOMVar(code){
    var domVar = code.match(/(var|const|let).+=.+require.+("|')react-dom("|').+;?/g);
    return (domVar) ? getVarName(domVar[0]) : null;
}


module.exports = mainCheckProcess;

function reload(){
    window.location.reload();
}