let https = require ('https');

let host = 'api.cognitive.microsoft.com';
let path = '/bing/v5.0/spellcheck';

let key = '349af78bccfb40e882f289c1d43498cc';


let mkt = "pt-BR";
let mode = "proof";
let text = "vamos na ksa dela come";
let query_string = "?mkt=" + mkt + "&mode=" + mode;

let request_params = {
    method : 'POST',
    hostname : host,
    path : path + query_string,
    headers : {
        'Content-Type' : 'application/x-www-form-urlencoded',
        'Content-Length' : text.length + 5,
        'Ocp-Apim-Subscription-Key' : key,
    }
};

let response_handler = function (response) {
    let body = '';
    response.on ('data', function (d) {
        body += d;
    });
    response.on ('end', function () {
        console.log (body);
    });
    response.on ('error', function (e) {
        console.log ('Error: ' + e.message);
    });
};

let req = https.request (request_params, response_handler);
req.write ("text=" + text);
req.end ();