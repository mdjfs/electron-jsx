const { stat, writeFile, watchFile, readdir, mkdir, existsSync, copyFile, unwatchFile } = require("fs");
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

function mainCheckProcess({ reactDir, distDir, main = "index.jsx" }) {
    if (reactDir && distDir) {
        check({ dirs: [reactDir, distDir] }, err => {
            const mainPath = path.join(reactDir, main);
            if (!err) check({ files: [mainPath] }, err => {
                if (!err) {
                    renderDev(distDir, reactDir, mainPath);
                }
            })
        });
    }
    else {
        write("Please set 'reactDir' and 'distDir' attributes when you call the function :P", true);
    }
}

function renderDev(distDir, reactDir, mainPath) {
    write("Rendering in Dev Mode... ^.^");
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
                    if (path.basename(file).includes(".jsx")) transformJSX(file, file.replace(reactDir, distDir).replace(".jsx", ".js"));
                    else streamFile(file, file.replace(reactDir, distDir), false);
                }
            }
        })
    }
    renderFolder(reactDir);
    var baseScript = document.createElement('script');
    baseScript.src = path.basename(mainPath).replace(".jsx", ".js");
    baseScript.type = "module";
    document.head.append(baseScript);
}

function streamFile(inputPath, outputPath, replace = true) {
    if (replace) copyFile(inputPath, outputPath, (err) => { if (err) write(err, true) });
    else copyFile(inputPath, outputPath, COPYFILE_EXCL, (_) => { });
    function listen() {
        write(`Copying ${path.basename(inputPath)} ... :P`); streamFile(inputPath, outputPath);
    }
    watchFile(inputPath, { interval: 1000 }, _ => { listen(); unwatchFile(inputPath) });
}

function transformJSX(inputPath, outputPath, writeOptions = { flag: 'wx' }) {
    babel.transformFile(inputPath, options, (err, data) => {
        if (err) write(err, true);
        else {
            data.code = data.code.replace(/require\(("|').[\w,\s-,/]+\.css("|')\)(?:\;?)/g, (value) => {
                var dir = value.match(/.[\w,\s-,/]+\.css/)[0];
                dir = dir.replace("./", outputPath.replace(path.basename(outputPath), ""));
                dir = dir.replace(/\\/g, "\\\\");
                return `document.head.append(Object.assign(document.createElement('link'),{rel:'stylesheet',type:'text/css',href:'${dir}'}))`
            });
            writeFile(outputPath, data.code, writeOptions, (_) => { });
        }
    });
    function listen() {
        write(`Compiling ${path.basename(inputPath)} ... :D`); transformJSX(inputPath, outputPath, { flag: 'w' });
    }
    watchFile(inputPath, { interval: 1000 }, _ => { listen(); unwatchFile(inputPath) });
}


module.exports = mainCheckProcess;