const functions = require('firebase-functions');

const admin = require('firebase-admin');
var firebase = admin.initializeApp(functions.config().firebase);

exports.alimentos = functions.https.onRequest((req, res) => {
	
	console.log('Dialogflow Request body: ' + JSON.stringify(req.body));
	let action = req.body.queryResult.action;
	let parameters = req.body.queryResult.parameters;
	let produto = parameters.produto;
	let loja = req.headers.loja;
	let source = req.body.originalDetectIntentRequest.source;
	
	
	if(action === 'procurarProduto'){
		var data = firebase.database().ref('/lojas/'+loja+'/alimentos'+produto);
		data.once("value").then(function(snapshot) {
		var alimentoDesc = snapshot.child('desc');
		var alimentoTipo = snapshot.child('tipo');
		var alimentoImage = snapshot.child('image');
		var r = {
			"fulfillmentMessages": [{
				"platform": "FACEBOOK",
					"card": {
						"title": produto,
						"subtitle": alimentoDesc,
						"imageUri": alimentoImage,
						"buttons": [{
							"text": "Comprar",
							"postback": "Comprar"
						}]
					}
	}]};
		var responseJson = {};
		if (source === "facebook") {
			responseJson= r;
			
                } 
                else {
                	responseJson = {fulfillmentText: r.length}; 
                }
                
        	res.json(responseJson);
        	
		return null;
		}).catch(error => {
		console.error(error);
		res.error(500);
		});
		
    	}                      
		
});



