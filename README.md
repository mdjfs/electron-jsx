# Electron-jsx

A simple wrapper to work easily with Electron App using React

![Quick Test](https://imgur.com/gghhTif.gif)

##  How electron-jsx works

  - Watch all files in specified directory (react sources)
  - Detect changes in files for automatic transpile with Babel and reload Window

Is a simple way to implement a SPA in electron app :D

# Then, how can I use it? (Quick Start)

In your index.html file, only you need call the package and tell about your react sources, after that you can call a JSX script in that html file...

```javascript
<script>
require("electron-jsx")(__dirname, {
    reactDir: "./react-sources",
})
</script>
<script react-src="./react-sources/index.jsx">
```

Quick start example:

```
npm init
npm install --global electron
npm install react react-dom path electron-jsx
```

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
        nodeIntegration: true
      }
    });
    win.loadFile(path.join(__dirname, "./index.html"))
    win.on("close", _ => win=null);
}

app.on("ready", createWindow);
app.on("activate", (!win) ? createWindow : undefined);
app.on("window-all-closed", app.quit);
```

./src/index.html :
```html
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>React Tests</title>
    <script>
        require("electron-jsx")(__dirname, {
            reactDir: "./react-app"
        })
    </script>
    <script react-src="./react-app/index.jsx"></script>
</head>

<body>
    <div id="root"></div>
</body>

</html>
```

./src/react-app/index.jsx :
```javascript
import React from "react";
import ReactDOM from "react-dom";

function Component(){
    return <div>Hello World</div>
}

ReactDOM.render(<Component/>,document.getElementById("root"));
```

now, you can:

```
electron ./src/electron.js
```

### *And ready!* that should work

I hope it can be of use to someone else! :)