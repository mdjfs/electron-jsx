
function capitalize(string){
    return string[0].toUpperCase() + string.substr(1, string.length);
}

module.exports = {capitalize};