const functions = require('firebase-functions');

const admin = require('firebase-admin');
var firebase = admin.initializeApp(functions.config().firebase);

exports.alimentos = functions.https.onRequest((req, res) => {
	
	let action = req.body.queryResult.action;
	let parameters = req.body.queryResult.parameters;
	let product = parameters.product;
	let store = req.headers.store;
	let source = req.body.originalDetectIntentRequest.source;
	
	if(action === 'procurarProduto'){
		var data = firebase.database().ref('stores/'+store+'/products');
		data.once("value").then(function(snapshot) {
		var message = prepareMessage(snapshot);

		var responseJson = {};
		if (source === "facebook") {
			responseJson.fulfillmentMessages = message.fulfillmentMessages;
			
                } 
                else {
                	responseJson = {fulfillmentText: message.fulfillmentText}; 
                }
            
            console.log(JSON.stringify(responseJson.fulfillmentMessages));    
        	res.json(responseJson);
        	
        	
		return null;
		}).catch(error => {
		console.error(error);
		res.error(500);
		});
		
    	}                      
		
});

function prepareMessage(data){
	
	let elements = [];

	data.forEach(function(snapshotProduct){
		var productDescription = snapshotProduct.child("description").val();
		var productType = snapshotProduct.child('type').val();
		var productImage = snapshotProduct.child('image').val();
		var productName = snapshotProduct.key;
		var productPreview = {
       		"title":productName,
        	"image_url":productImage,
       		"subtitle":"produto bom",
        	"buttons":[{
           		"type":"postback",
           		"title":"Comprar",
           		"payload":"postback buy "+ productName
        	}]
    	};

    elements.push(productPreview);
    });

    let message = {
		"fulfillmentMessages": [{
			"payload": {
				"facebook":{
					"attachment":{
      					"type":"template",
     					"payload":{
        					"template_type":"generic",
        					"elements":elements
      					}
      				}
    			}
			}
		}]
	};

    return message;
	
}

