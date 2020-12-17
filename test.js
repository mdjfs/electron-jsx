const babel = require("@babel/core");
const {readFileSync, writeFileSync} = require("fs");
const path = require("path");
const {manageImport, manageCssImport, writeCssHandler} = require("./babel/transformers");
const {getReactDOM, getCssImports} = require("./babel/parsers");

var code = readFileSync(path.join(__dirname, "test1.jsx"), {encoding: "utf-8"});
getCssImports(code).then(value => console.log(value)).catch(error => console.error(error));