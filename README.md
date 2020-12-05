# Electron-jsx

Code made from a developer who stays up late for another who also needs coffee

You need use node modules in your Electron App using react?
========
There is a way. I think so

![Quick Test](https://imgur.com/gghhTif.gif)

# ✋ Before continuing, read this:

This is BETA version, you can use that with issues/limitations, if you find any bug or you want to say how to fix something, you can go to https://github.com/mdjfs/electron-jsx/issues and if  you can do a pull request 

If you want to be a contributor and help, you will benefit many developers by making the library more stable

##  How electron-jsx works

  - Watch all files in specified directory (react sources)
  - Detect changes in files for transpile with Babel (and more things), afther that, it reload the Window

Is a "simple" way to dev with React in Electron Apps using node modules

# Then, how can I use it? (Quick Start)

You need work with .jsx files and tell to package where is the folder with all sources to be transpiled, something like that:
![Structure](https://imgur.com/5bFdMML.jpg)
^ ^ ^ Example of the structure of your app

In your electron.js file you have a basic Electron Application: 

./src/electron.js :
```javascript
const { app, BrowserWindow } = require("electron");
const path = require("path");
let win;

function createWindow () {
    win = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        nodeIntegration: true // very important !!
      }
    });
    win.loadFile(path.join(__dirname, "./index.html"))
    win.on("close", _ => win=null);
}

app.on("ready", createWindow);
app.on("activate", (!win) ? createWindow : undefined);
app.on("window-all-closed", app.quit);
```

That will create a window that shows the html file, but, it is *very important* that this window can use the node integration 

Then, in your HTML file specify where are the app files (in the example is "./react-app"), Also you need tell about where is your entry point file 
```html
<script>
require("electron-jsx")(__dirname, {
    reactDir: "./react-app",
})
</script>
<script react-src="./react-app/index.jsx">
```

Install the packages:

```bash
npm init
npm install --global electron
npm install react react-dom path electron-jsx
```
Then, run the command:
```bash
electron ./src/electron.js
```

**You should automatically see a react-builds folder with all your files transpiled inside**
And if all its ok, you can see the react app in the electron window... (Be patient, things don't always work out the first time)

Features (v0.0.4)
==============
* No more regular expressions, everything is transpiled using babel
* Implementation of a JSX component to handle CSS without webpack
* Cleaner and more commented code

Issues Detected
===============
* If you import more than 1 CSS file in your component, it will double the import
* You can do that: *export default function YourComponent(){}* but not that: *export default class YourComponent extend React ...* Instead of that, btw the best way is the *export default YourComponent;* (export the expression)

If you detect more issues, please tell about that in the github repository !

I hope I have helped someone 😊


