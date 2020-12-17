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
  rmdir
} = require("fs");
const path = require("path");
const babel = require("@babel/core");

const fullPaths  = {
  reactDir: undefined,
  reactSrc: undefined,
  electronLib: undefined
}

// var for dynamics config of babel custom css plugin:

let componentCssName = "ElectronJSXCSS";
let componentCssSource;
const addOn = {
  presets: [],
  plugins: []
}

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
 * @param {CallableFunction} func
 * @param {Array<any>} params
 *
 * @returns {Promise<any,Error>}
 */
function promisify(func, params = []) {
  return new Promise((resolve, reject) => {
    params.push((err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
    func(...params);
  });
}

/** Return True if is a dev mode */
function isDevMode() {
  return (process.env.NODE_ENV && process.env.NODE_ENV != "production" || process.env.ELECTRON_IS_DEV);
}

module.exports = async function (
  dirname,
  { reactDir, overridePlugins=[], overridePresets=[] }
) {
  try {
    // set additional plugin or presets:
    addOn.plugins = overridePlugins;
    addOn.presets = overridePresets;
    write(`Starting in ${isDevMode() ? "development" : "production"} mode`);
    // get paths:
    var full_reactDir = path.join(dirname, reactDir);
    var full_reactBuilds = path.join(dirname, "./react-builds");
    var full_electronLib = path.join(dirname, "./electron-jsx-lib");
    // make build and lib dir:
    await _mkdirs([full_reactBuilds, full_electronLib]);
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
        
        window.addEventListener("error", (e) => {console.log(`El erroj: ${e}`)});
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
  const isScript = filename.endsWith(".js") || filename.endsWith(".jsx");
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
      const inspect = await callbackToPromise(stat, [path.join(output, file)]);
      if(inspect.isDirectory()) await callbackToPromise(rmdir, [path.join(output, file), {recursive: true}])
      else await callbackToPromise(unlink, [path.join(output, file)]);
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

async function build(input, output){
  var code = await promisify(readdir, [input]);
  babel.transform()
  // manage imports and handle CSS:
  var cssImported = false;
  code = babel.transformAsync(code, {
    plugins: [
      "@babel/plugin-syntax-jsx",
      {
        visitor: {
          ImportDeclaration(_path) {
            const value = _path.node.source.value;
            const isRelativePath = !path.isAbsolute(value) && value[0] === ".";
            if(isRelativePath){
              if(path.endsWith(".css")){
                if(!cssImported){
                  // change import "example.css" to import {componentName} from "./electron-jsx-lib/{componentName}"
                  _path.node.source.value = path.join("./electron-jsx-lib", componentCssName);
                  _path.node.specifiers = [babel.types.importDefaultSpecifier(babel.types.identifier(capitalize(componentCssName)))];
                }
                else{

                }
              }else{

              }
            }
            if (isRelativePath && path.endsWith(".css") && !cssImported) {
              // change import "example.css" to import {componentName} from "./electron-jsx-lib/{componentName}"
              _path.node.source.value = path.join("./electron-jsx-lib", componentCssName);
              _path.node.specifiers = [babel.types.importDefaultSpecifier(babel.types.identifier(capitalize(componentCssName)))];
            }else if(isRelativePath){
              _path.node.source.value = path.join("./react-builds",_path.node.source.value);
            }
          },
        },
      },
    ],
  }).code;
  // transform JSX:
  code = await babel.transformAsync(code, {
    presets: ["@babel/preset-react"],
    plugins: ["@babel/plugin-transform-modules-commonjs"],
  }).code;
  code = await promisify(babel.transform, [code, ]).code;
}

/**
 * make dir, returns false if any dir exists
 * @param {Array<String>} paths
 */
async function _mkdirs(paths) {
  var err = false;
  for(const path of paths){
    try{
      await promisify(mkdir, [path, { recursive: true }]);
    }
    catch{
      err = true;
    }
  }
  return err;
}


const updateComponentWithCss = {
  JSXElement(path) {
    if (
      this.reactDomVar !== null &&
      path.parent.type === "CallExpression" &&
      path.parent.callee.object.name === this.reactDomVar &&
      path.parent.callee.property.name === "render"
    ) {
      const identifier = t.JSXIdentifier(this.opts.componentName.toString());
      path.parent.arguments[0] = t.JSXElement(
        t.JSXOpeningElement(identifier, [
          t.JSXAttribute(
            t.JSXIdentifier("link"),
            t.StringLiteral(this.cssPath.toString())
          ),
        ]),
        t.JSXClosingElement(identifier),
        [path.node]
      );
    }
  },
  ExportDefaultDeclaration(path) {
    const name = path.node.declaration.name;
    // detect if is export default Component;
    if (name) {
      // construct the JSX for the default export if the default export is a name
      const JSXExport = t.JSXElement(
        t.JSXOpeningElement(t.JSXIdentifier(name), []),
        t.JSXClosingElement(t.JSXIdentifier(name)),
        [],
        false
      );
      const JSXGlobal = getComponentForCss(
        this.opts.componentName,
        this.cssPath,
        [JSXExport]
      );
      path.node.declaration = t.functionDeclaration(
        t.identifier("_default_css_jsx"),
        [],
        t.blockStatement([t.returnStatement(JSXGlobal)]),
        false,
        false
      );
    } else if (path.node.declaration.type == "FunctionDeclaration") {
      // construct the JSX for the default export if the default export is a function
      const func = path.node.declaration.body;
      if (func.body.length > 0) {
        for (var statement of func.body) {
          if (
            statement.type === "ReturnStatement" &&
            statement.argument.type === "JSXElement"
          ) {
            statement.argument = getComponentForCss(
              this.opts.componentName,
              this.cssPath,
              [statement.argument]
            );
          }
        }
      }
    }
  },
};

function capitalize(string){
  return string[0].toUpperCase() + string.substr(1, string.length);
}


async function getVar_ReactDOM(code){
  var reactDOM = null;
  await babel.parseAsync(code, {
    ImportDeclaration(_path){
      const value = _path.node.source.value;
      if(value === "react-dom" )
        for (var specifier of _path.node.specifiers) {
          if (specifier.type === "ImportDefaultSpecifier") 
            reactDOM = specifier.local.name;
      }
    }
  })
  return reactDOM;
}