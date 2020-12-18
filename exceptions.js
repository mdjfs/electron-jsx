const {startReportingRuntimeErrors, reportBuildError, dismissBuildError} = require("react-error-overlay");

var start = false;

function printError(e, filepath=null){
    try{   
        if(!start) startReportingRuntimeErrors({onerror: () => {}})
        start = true;
    }catch{

    }

    try{
        dismissBuildError();
    }finally{
        if(e){
            reportBuildError((filepath) ? 
            `${e}
            @path: ${filepath}` : e);
        }
    }
}

module.exports = printError;