import React, { useState, useEffect } from "react";
import { readFile } from "fs";

function CSS(props){

    const [style, setStyle] = useState("");
    const [startRead, setStartRead] = useState(false);

    useEffect(() => {
        if(props.links){
            if(!startRead){
                var maxLinks = props.links.length-1;
                var count = 0;
                setStartRead(true);
                function read(){
                    readFile(props.links[count], {encoding: "utf-8"}, (err, data) => {
                        if(!err){
                            setStyle(style + data);
                            if(count < maxLinks){
                                count++;
                                read();
                            }
                        } else console.error(`Error loading styles: ${err}`);
                    });
                }
                read();
            }
        }
    });

    return <React.Fragment>
        <style>{style}</style>
        {props.children}
    </React.Fragment>

}

export default CSS;