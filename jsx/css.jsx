import React, { useState, useEffect } from "react";
import { readFile } from "fs";

function CSS(props){

    const [style, setStyle] = useState("");
    const [startRead, setStartRead] = useState(false);

    useEffect(() => {
        var maxLinks = 0;
        if(props.links && props.links.length > 0){
            if(!startRead){
                setStartRead(true);
                maxLinks = props.links.length-1;
                var count = 0;
                function read(){
                    if(count < props.links.length && props.links[count]){
                        readFile(props.links[count], {encoding: "utf-8"}, (err, data) => {
                            if(!err && count < props.links.length && props.links[count]){
                                setStyle(style + data);
                                count++;
                                read();
                            } else console.error(`Error loading styles: ${err}`);
                        });
                    }
                }
                read();
            }
        }
        return (props.links) ? maxLinks = props.links.length + 1 : null; 
    });

    return <React.Fragment>
        <style>{style}</style>
        {props.children}
    </React.Fragment>

}

export default CSS;