const {startReportingRuntimeErrors, reportBuildError, dismissBuildError} = require("react-error-overlay");

var start = false;

/**
 * Print error message
 * @param {Error} e 
 * @param {String} filepath - says file location of error
 */
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