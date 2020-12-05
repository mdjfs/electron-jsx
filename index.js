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
} = require("fs");
const path = require("path");
const babel = require("@babel/core");

// initial configs for babel:

const config_babelJSXtoJS = {
  presets: ["@babel/preset-react"],
  plugins: ["@babel/plugin-transform-modules-commonjs"],
};

// var for dynamics config of babel custom css plugin:

let componentCssName = "ElectronJSXCSS";
let componentCssSource;
let morePlugins = [];

/**
 *
 * @param {String} text
 * @param {Boolean} err
 */
function write(text, err = false) {
  text = text ? text.toString() : undefined;
  if (text) {
    err
      ? process.stderr.write(`[ERROR] electron-jsx: ${text}\n`)
      : process.stdout.write(`electron-jsx:  ${text}\n`);
  }
}

/**
 * Check if file or folder is valid
 * @param {Function} func
 * @param {Array<any>} params
 *
 * @returns {Promise<any,Error>}
 */
function callbackToPromise(func, params = []) {
  return new Promise((resolve, reject) => {
    params.push((err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
    func(...params);
  });
}

/**
 * Return True if is a dev mode
 */
function isDevMode() {
  return process.env.NODE_ENV.toString().toLowerCase().includes("dev");
}

module.exports = async function (
  dirname,
  { reactDir, overridePlugins, overridePresets }
) {
  try {
    //set additional plugin or presets:
    if (overridePlugins && overridePlugins.length > 0) {
      config_babelJSXtoJS.plugins = config_babelJSXtoJS.plugins.concat(
        overridePlugins
      );
      morePlugins = overridePlugins;
    }
    if (overridePresets && overridPresets.length > 0) {
      config_babelJSXtoJS.presets = config_babelJSXtoJS.presets.concat(
        overridePresets
      );
    }
    // check enviroment:
    process.env.NODE_ENV = process.env.NODE_ENV ? process.env.NODE_ENV : "dev";
    write(`Starting in ${process.env.NODE_ENV} mode`);
    reactDir = path.join(dirname, reactDir);
    //check dirs:
    for (var dir of [dirname, reactDir]) {
      const result = await callbackToPromise(stat, [dir]);
      if (!result.isDirectory()) throw `${dir} needs to be a Directory`;
    }
    //make build dir:
    const buildDir = path.join(dirname, "./react-builds");
    await callbackToPromise(mkdir, [buildDir, { recursive: true }]);
    //make lib dir:
    const libDir = path.join(dirname, "./electron-jsx-lib");
    await callbackToPromise(mkdir, [libDir, { recursive: true }]);
    //write ElectronJSXCSS Component:
    const result = await JSXtoJS(
      path.join(__dirname, componentCssName + ".jsx")
    );
    componentCssSource = path.join(libDir, componentCssName + ".js");
    await callbackToPromise(writeFile, [componentCssSource, result.code]);
    //sync files and start render process:
    await syncFolder(reactDir, buildDir, ".");
    // set entry point:
    var scripts = document.getElementsByTagName("script");
    for (var script of scripts) {
      if (script.getAttribute("react-src")) {
        var reactSrc = script.getAttribute("react-src");
        script.type = "module";
        script.src = reactSrc
          .replace(
            path.basename(path.join(reactSrc, "..")),
            path.basename(buildDir)
          )
          .replace(".jsx", ".js");
      }
    }
  } catch (error) {
    // if the main process have a error, display it:
    write(error, true);
    console.error(error);
  }
};

// get more babel plugins for only syntax purposes
function getSyntaxAddonPlugins() {
  return morePlugins.filter((value) => value.includes("syntax"));
}

/**
 * Process file (copy or transpile if is a .js or .jsx)
 * and watch for futures changes if watch
 * parameter is set to True
 *
 * @param {String} buildDir
 * @param {String} reactDir
 * @param {String} relativeInputPath
 * @param {Boolean} watch
 * @param {Boolean} onlyListen
 */
async function renderFile(
  buildDir,
  reactDir,
  relativeInputPath,
  watch = isDevMode(),
  onlyListen = false
) {
  // get info relative to path:
  const filename = path.basename(relativeInputPath);
  const isScript = filename.includes(".js") || filename.includes(".jsx");
  const outputFilePath = path
    .join(buildDir, relativeInputPath)
    .replace(".jsx", ".js");
  const inputFilePath = path.join(reactDir, relativeInputPath);
  // transpile/copy file if onlyListen is false
  if (!onlyListen) {
    await mkdirIfNotExists(path.dirname(outputFilePath));
    if (isScript) {
      // transpile for CSS imports (babel-plugin-css-jsx-modules)
      var css = await CSSinJSX(
        inputFilePath,
        path.join(buildDir, path.dirname(relativeInputPath))
      );
      await readAndCreateIfNotExists(outputFilePath);
      await callbackToPromise(writeFile, [outputFilePath, css.code]);
      // transpile for change relative imports to absolute imports
      var imports = babel.transform(css.code, {
        plugins: [
          "@babel/plugin-syntax-jsx",
          ...getSyntaxAddonPlugins(),
          {
            visitor: {
              ImportDeclaration(_path) {
                if (
                  !path.isAbsolute(_path.node.source.value) &&
                  _path.node.source.value[0] === "."
                ) {
                  _path.node.source.value = path.join(
                    buildDir,
                    path.dirname(relativeInputPath),
                    _path.node.source.value
                  );
                }
              },
            },
          },
        ],
      });
      await callbackToPromise(writeFile, [outputFilePath, imports.code]);
      // transpile to JSX format
      var jsx = await JSXtoJS(outputFilePath);
      await callbackToPromise(writeFile, [outputFilePath, jsx.code]);
    } else {
      // copy if the file is not a script
      await callbackToPromise(copyFile, [inputFilePath, outputFilePath]);
    }
  }
  if (watch) {
    // watch file for futures changes
    watchFile(inputFilePath, { interval: 1000 }, async (curr, prev) => {
      if (curr.atime > prev.atime) {
        write(`Rendering ${filename}...`);
        await renderFile(buildDir, reactDir, relativeInputPath, false);
        if (isScript) window.location.reload();
      }
    });
  }
}

/**
 * Create file if not exist and return the content, (usually "")
 * @param {String} file
 */
async function readAndCreateIfNotExists(file) {
  try {
    return await callbackToPromise(readFile, [file]);
  } catch {
    await callbackToPromise(writeFile, [file, ""]);
    return await callbackToPromise(readFile, [file]);
  }
}

/**
 * Transform JSX file to JS and return the code
 * @param {String} file
 */
async function JSXtoJS(file) {
  var code = await readAndCreateIfNotExists(file);
  return await callbackToPromise(babel.transform, [code, config_babelJSXtoJS]);
}

/**
 * Transform CSS to handle with external component and return the code
 * @param {String} file
 * @param {String} rootDir
 */
async function CSSinJSX(file, rootDir) {
  var code = await readAndCreateIfNotExists(file);
  return await callbackToPromise(babel.transform, [
    code,
    {
      plugins: [
        "@babel/plugin-syntax-jsx",
        ...getSyntaxAddonPlugins(),
        [
          "babel-plugin-css-jsx-modules",
          {
            componentName: componentCssName,
            rootDir: rootDir,
            componentDir: componentCssSource,
          },
        ],
      ],
    },
  ]);
}

/**
 * Listen two folders to sync files recursive (with special handle for .jsx and .js files)
 * @param {String} inputRootFolder
 * @param {String} outputRootFolder
 * @param {String} relativePath
 */
async function syncFolder(inputRootFolder, outputRootFolder, relativePath) {
  // info about the path:
  var input = path.join(inputRootFolder, relativePath);
  var output = path.join(outputRootFolder, relativePath);
  var inputFiles = await callbackToPromise(readdir, [input]);
  var outputFiles = await callbackToPromise(readdir, [output]);
  // check if output dir have a file that doesn't have the input dir and delete it
  for (var file of outputFiles) {
    if (
      !inputFiles.includes(file) &&
      !inputFiles.includes(file.replace(".js", ".jsx"))
    ) {
      await callbackToPromise(unlink, [path.join(output, file)]);
    }
  }
  // read files:
  for (var file of inputFiles) {
    const inspect = await callbackToPromise(stat, [path.join(input, file)]);
    if (inspect.isDirectory()) {
      // sync that folder if is a directory (Recursive model)
      await mkdirIfNotExists(path.join(outputRootFolder, file));
      syncFolder(
        inputRootFolder,
        outputRootFolder,
        path.join(relativePath, file)
      );
    } else if (
      !outputFiles.includes(file) &&
      !outputFiles.includes(file.replace(".jsx", ".js"))
    ) {
      // if is a file ... Process the file
      await renderFile(
        outputRootFolder,
        inputRootFolder,
        path.join(relativePath, file),
        true
      );
    } else {
      // if is a file and the file exists, only listen for futures changes
      await renderFile(
        outputRootFolder,
        inputRootFolder,
        path.join(relativePath, file),
        true,
        true
      );
    }
  }
}

/**
 * make dir, returns false if the dir exists
 * @param {String} path
 */
async function mkdirIfNotExists(path) {
  try {
    await callbackToPromise(mkdir, [path, { recursive: true }]);
    return true;
  } catch {
    return false;
  }
}
