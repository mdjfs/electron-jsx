# Electron-jsx

Real time Transpiler for Electron Apps file-based

# Code in React, use Node modules
![Quick Test](https://imgur.com/fakZsin.gif)
That's not looks pretty?

# New Features!

### Hot Loading
![Quick Test](https://imgur.com/HDdyrRg.gif)

### Error handling
![Quick Test](https://imgur.com/S2Zqodw.jpg)

# ✋ Before continuing, read this:

This is a BETA version, recently is more stable, but you may can found bugs, if you found any bug and/or you want to say how to fix something, you can go to https://github.com/mdjfs/electron-jsx/issues to contribute me and community ! (:


## How electron-jsx works

- Watch all files in specified directory (react sources)
- Detect changes in files for transpile with Babel (and more things) to reload the App
- File Based, no server, no web pack. Just babel transpiler
- The imports ES6 are transpiled to require functions


# Then, how can I use it? (Quick Start)

You need work with .jsx files and tell to package where is the folder
with all sources to be transpiled, something like that:

![Structure](https://imgur.com/5bFdMML.jpg)

^ ^ ^ Example of the structure of your app

In your electron.js file you have a basic Electron Application:

./src/electron.js :

```javascript
const { app, BrowserWindow } = require("electron");
const path = require("path");
let win;

function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true, // very important !!
    },
  });
  win.loadFile(path.join(__dirname, "./index.html"));
  win.on("close", (_) => (win = null));
}

app.on("ready", createWindow);
app.on("activate", !win ? createWindow : undefined);
app.on("window-all-closed", app.quit);
```

That will create a window and shows the html file, but it's **_very important_** if the window can use node integration

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
npm install react react-dom electron-jsx
```

Then, run the command:

```bash
electron ./src/electron.js
```

**You should automatically see a react-builds folder with all your files transpiled inside**
And if all its ok, you can see the react app in the electron window... (Be patient, things don't always work out the first time)

# Features (v0.0.5)

- Hot Loading
- Error handling
- Fixed bugs in listeners of directories
- Fixed bugs about imports more than one stylesheet
- Fixed other bugs

# Issues Detected

- I not recommend use stylesheet files, instead of that stylesheets with libraries like Material-UI is prefered. You can use your own stylesheets, but may you will see any bugs with the transpiler/stylesheet


If you detect more issues, please tell about that in the github repository !

I hope I have helped someone 😊


