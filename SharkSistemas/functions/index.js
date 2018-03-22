const functions = require('firebase-functions');
//const Compra = require ('ClasseCompra');
const admin = require('firebase-admin');
var firebase = admin.initializeApp(functions.config().firebase);

exports.alimentos = functions.https.onRequest((req, res) => {
	
	let action = req.body.queryResult.action;
	let parameters = req.body.queryResult.parameters;
	let store = req.headers.store;
	let source = req.body.originalDetectIntentRequest.source;
	let elements = [];
	let dataRef = firebase.database().ref('stores/'+store);
	let re = new RegExp('/sessions/(.*)');
	let userId =  re.exec(req.body.session);
	retrieveUserData(userId[1], store, res);

	if(action === 'searchProduct'){
		let product = parameters.produto;
		let data = firebase.database().ref('stores/'+store+'/products/'+product);
		data.once("value").then(function(snapshot) {
			elements.push(prepareMessage(snapshot));
			let responseJson = prepareResponse(elements, source);
			console.log(JSON.stringify(snapshot));
		   	res.json(responseJson);     	
        	return null;
		}).catch(error => {
			console.error(error);
			let responseJson = prepareError();
			res.json(responseJson);
		});	
    }

    else if(action === 'menu'){
		let data = firebase.database().ref('stores/'+store+'/products');
		data.once("value").then(function(snapshot) {        	
       		snapshot.forEach(function(snapshotProduct){
				let productPreview = prepareMessage(snapshotProduct, store);
    			elements.push(productPreview);
    		});
    		let responseJson = prepareResponse(elements, source);  
			res.json(responseJson);
			return null;
		}).catch(error => {
			console.error(error);
			let responseJson = prepareError();
			res.error(500);
		});
    }

    else if(action === 'searchCategory'){
    	let category = parameters.category;
		let data = firebase.database().ref('stores/'+store+'/products');
		data.orderByChild('categories/'+category).equalTo(true).once("value").then(function(snapshot) {
			snapshot.forEach(function(snapshotProduct){
				elements.push(prepareMessage(snapshotProduct, store));
			});
			
			let responseJson = prepareResponse(elements, source);  
			res.json(responseJson);
			return null;
			}).catch(error => {
				console.error(error);
				let responseJson = prepareError();
				res.error(500);
			});				
    }

    else if(action === 'buyComplex'){
    	let product = parameters.produto;
    	let data = firebase.database().ref('stores/'+store+'/products/'+product);
    	let choice;
    	data.once('value').then(function(snapshot){
    		let choiceType = snapshot.child('choiceType').val();
    		snapshot.child('values').forEach(function(snapshotChoice){
    			let queryMessage;
    			let choicePreview;
    			if(snapshotChoice.child('index').val() === 0){
    				queryMessage = snapshotChoice.child('message').val();
    				snapshotChoice.child('options').forEach(function(snapshotOptionIndex){
    					snapshotOptionIndex.forEach(function(snapshotOption){
    						let options = prepareOpt(snapshotOption.key, snapshotOption.val());
    						choicesPreview.push(options);
    					});
    				});
    			}
    			choice = prepareChoice(queryMessage, choicesPreview);
    		});
    		let responseJson = prepareQRMsg(choice);
    		res.json(responseJson);
    		return null
    	}).catch(error => {
			console.error(error);
			let responseJson = prepareError();
			res.JSON(responseJson);
		});	
    }

    else if(action === 'buySimple'){
		let product = parameters.produto;
    	newProduct(firebase.database().ref('stores/'+store+'/clients/'+userId+'/orderTemp'), product);
    }

    else if(action === 'finalizarCompra'){
    	newOrder(firebase.database().ref('stores/'+store+'/orders/'+firebase.database.ServerValue.TIMESTAMP), firebase.database().ref('stores/'+store+'/clients/'+userId+'/orderTemp'));
    }                      
		
});



function prepareQRMsg(snapshotVec)
{
	var	message = {
		"fulfillmentMessages": [{
			"payload": {
				"facebook": snapshotVec
			}
		}]
	};
	return message;

}

function prepareChoice(snapshotText, snapshotQR){

	var choices = {
		"text": snapshotText,
		"quick_replies":snapshotQR
	};
	return choices;

}

function prepareOpt(snapshotResponse1,snapshotResponse2){
	var options = {
		"content_type":"text",
	    "title":snapshotResponse1 + ": 	R$" + snapshotResponse2,
	    "payload":"okFunfando"					        
	};
	return options;
}


function prepareMessage(snapshotProduct, store){
	let productDescription = snapshotProduct.child("description").val();
	let productType = snapshotProduct.child('type').val();
	let productImage = snapshotProduct.child('image').val();
	let productName = snapshotProduct.key;
	let productValueType = snapshotProduct.child('valueType').val();
	let productValue;
	let buyButton;
	if(productValueType === 'simple'){
		productValue = 'R$ '+snapshotProduct.child('value').val(); 
		buyButton = {
			"type":"postback",
        	"title":"COMPRAR",
        	"payload":"postback buySimple "+ productName
		};
	}
	else{
		snapshotProduct.child('values').forEach(function(choice){
			if(choice.child('type').val()==='price'){
				choice.child('options').forEach(function(options){
					options.forEach(function(separateOptions){
						productValue += separateOptions.key+'- R$'+separateOptions.val()+'\n';
						buyButton = buyButton = {
							"type":"postback",
				        	"title":"COMPRAR",
				        	"payload":"postback buyComplex "+ productName
						}; 
					});
				});
			}
		});
	}

	var productPreview = {
    	"title":productName,
       	"image_url":productImage,
    	"subtitle":productValue,
      	"buttons":[

      		buyButton,
        {
        	"type":"postback",
        	"title":"Detalhes",
        	"payload":"postback details "+ productName
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

function prepareError(){
	let responseJson = {};
	responseJson = {fulfillmentText: "Ocorreu um erro no servidor :(. \nTente novamente."};
	return responseJson;
}

function newOrder(orderRef, orderTemp, res){
	orderTemp.once('value').then(function(snapshot){
		orderRef.set({
			snapshot
		});
		return null;
	}).catch(error => {
		console.error(error);
		let responseJson = prepareError();
		res.error(500);
	});				
	
}

function newProduct(productRef, product){
	productRef.set({
		product:{
			"qtd":1
		}
	});
}

function retrieveUserData(userId, store, res){
	let data = firebase.database().ref('stores/'+store+'/clients/'+userId);
	data.once('value').then(function(snapshot){
		if(snapshot.exists()){
			let client;
		}
		else{
			let clientRef = firebase.database().ref('stores/'+store+'/clients');
			clientRef.set({
				[userId]:{
					"name":"Indeterminado"
				}
			});
		}
		return null;
	}).catch(error => {
		console.error(error);
		let responseJson = prepareError();
		res.json(responseJson);
	});				
}