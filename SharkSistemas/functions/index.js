const functions = require('firebase-functions');

const admin = require('firebase-admin');
var firebase = admin.initializeApp(functions.config().firebase);

exports.alimentos = functions.https.onRequest((req, res) => {
	
	let action = req.body.queryResult.action;
	let parameters = req.body.queryResult.parameters;
	let store = req.headers.store;
	let source = req.body.originalDetectIntentRequest.source;
	var elements = [];
	let dataRef = firebase.database().ref('stores/'+store);
	
	if(action === 'searchProduct'){
		let product = parameters.produto;
		let data = firebase.database().ref('stores/'+store+'/products/'+product);
		data.once("value").then(function(snapshot) {
			elements.push(prepareMessage(snapshot));
			let responseJson = prepareResponse(elements, source);  
		   	res.json(responseJson);      	
        	return null;
		}).catch(error => {
			console.error(error);
			res.error(500);
		});	
    }

    else if(action === 'menu'){
		let data = firebase.database().ref('stores/'+store+'/products');
		data.once("value").then(function(snapshot) {        	
       		snapshot.forEach(function(snapshotProduct){
				let productPreview = prepareMessage(snapshotProduct);
    			elements.push(productPreview);
    		});
    		let responseJson = prepareResponse(elements, source);  
			res.json(responseJson);
			return null;
		}).catch(error => {
			console.error(error);
			res.error(500);
		});
    }

    else if(action === 'searchCategory'){
    	let category = parameters.category;
		let dataCategory = firebase.database().ref('stores/'+store+'/categories/'+category);
		dataCategory.once("value").then(function(snapshot) {
			var products = snapshot.val();
			var promises = [];
			products.forEach(function(productInCategory){
				let data = firebase.database().ref('stores/'+store+'/products/'+productInCategory);
				data.once("value", function(snapshotProduct) {
					elements.push(prepareMessage(snapshotProduct));
				});
				console.log(JSON.stringify(promises));		
			});
			console.log(JSON.stringify(promises));		
			let responseJson = prepareResponse(promises, source);  
			res.json(responseJson);
			return null;
		}).catch(error => {
			console.error(error);
			res.error(500);
		});			
    }                      
		
});


function prepareMessage(snapshotProduct){
	var productDescription = snapshotProduct.child("description").val();
	var productType = snapshotProduct.child('type').val();
	var productImage = snapshotProduct.child('image').val();
	var productName = snapshotProduct.key;
	var productValueType = snapshotProduct.child('valueType').val();
	var productValue = '';
	if(productValueType === 'simple'){
		productValue = 'R$ '+snapshotProduct.child('value').val(); 
	}
	else{
		let productValues = snapshotProduct.child('values').toJSON();
		Object.keys(productValues).forEach(function(key){
			productValue += key+'- R$'+productValues[key]+'\n'; 
		});
		productValue -='\n';
	}
	var productPreview = {
    	"title":productName,
       	"image_url":productImage,
    	"subtitle":productValue,
      	"buttons":[{
     		"type":"postback",
        	"title":"Comprar",
        	"payload":"postback buy "+ productName
        }]
    };

    return productPreview;    	
}

function prepareResponse(elements, source){
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
	let responseJson = {};
	if (source === "facebook") {
		responseJson.fulfillmentMessages = message.fulfillmentMessages;	
    } 

    else {
    	responseJson = {fulfillmentText: message.fulfillmentText}; 
    }

    return responseJson;	   	
}