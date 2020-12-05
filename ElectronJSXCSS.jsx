import React, { useEffect, useState } from "react";
import {Helmet} from "react-helmet";
import fs from "fs";

function ElectronJSXCSS(props){
    const [style, setStyle] = useState(null);
    const [isWatched, setIsWatched] = useState(false);

    let handleChanges = (curr, prev) => {
        if(curr.atime > prev.atime){
            loadStyles(props.link, loadStylesCallback);
        }
    };

    let loadStylesCallback = (err, styles) => {
        if(err) console.error(err);
        else{
            if(!isWatched && process.env.NODE_ENV.includes("dev")){
                fs.watchFile(props.link, handleChanges);
                setIsWatched(true);
            }
            setStyle(styles);
        }
    }

    useEffect(() => {
        if(props.link && !style)
        {
            loadStyles(props.link, loadStylesCallback);
        };
        return (style) ? () => { 
            setStyle(null);
            setIsWatched(false);
            fs.unwatchFile(props.link, handleChanges); } : null;
    })

    function loadStyles(link, callback){
        fs.readFile(link, {encoding: "utf-8"} , (err, styles) => {
            callback(err, styles);
        });
    }

    return <React.Fragment>
        {props.children}
        <Helmet>
            <style>{style}</style>
        </Helmet>
    </React.Fragment>

}

export default ElectronJSXCSS;