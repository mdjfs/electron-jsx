# React-jsx

A simple wrapper to work easily with Electron App using React

##  How react-jsx works

  - Watch all files in specified directory (react app sources)
  - Detect changes in files and automatic re-compile and transpile with Babel

Is a simple way to implement a SPA in react app :D

# Then, how can I use it? (Quick Start)

In your index.html file, you need require the package and set "reactDir" parameter with all of your application sources (I recommend that it be apart from the "src" folder or similar) and "main" ("index.jsx" by default)

```javascript
<script>
const fs = require("fs");
require("electron-jsx")({
    reactDir: path.join(__dirname,"../anywhere/else/etc/my-react-app")
})
// in your folder "my-react-app" you need the index.jsx, and maybe components, pages, other jsx, css, etc
</script>
```
You can also change name of entry point like "main.jsx" or anything

# Setting up for Development Enviroment !

Maybe you should use the package "electron-reload" to detect changes in your project, then, you can also have a directory structure like this:

- dist
-- index.html
- src
-- react-app / index.jsx
-- electron.js

Quick start in electron.js:

```javascript

require("electron-reload")(path.join(__dirname, "../dist"))

win = new BrowserWindow({
      webPreferences: {
        nodeIntegration: true // very important !
      }
    });
win.load(path.join(__dirname, "../dist/index.html")
```

Quick start in index.html:
```javascript
<head>
    <script>
        const fs = require("fs");
        require("electron-jsx")({
            reactDir: path.join(__dirname,"../src/react-app")
        })
    </script>
</head>
<body>
    <div id="root"></div>
</body>
```

Quick start in index.jsx:
```javascript

import React from "react";
import ReactDOM from "react-dom";

function Component(){
    return <div>Hello !!!!!</div>
}

ReactDOM.render(<Component/>,document.getElementById("root"));
```

### *And ready!* that should work

I hope it can be of use to someone else! :)