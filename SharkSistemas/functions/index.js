const functions = require('firebase-functions');
const Compra = require ('ClasseCompra');
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
			console.log(JSON.strigify(snapshot));
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
				let productPreview = prepareMessage(snapshotProduct);
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
				elements.push(prepareMessage(snapshotProduct));
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
   	else if (action === 'buy'){
   		let product = parameters.produto;
   		var message
		let data = firebase.database().ref('stores/'+store+'/products/'+product);
		data.once("value").then(function(snapshot) {
        	if(snapshot.child("valueType").val() === "complex" ){
        		let vetorzon = [];
        		snapshot.child("values").forEach(function(snapshotSize){
        			//console.log(JSON.stringify(snapshotSize.key));
        			var vetorzin = [];
        			var messageVec= null;

        			snapshotSize.forEach(function(SizeValues){
        				if(SizeValues.key === "message"){
        					//console.log(SizeValues.val());
        					messageVec = SizeValues.val();
        				}else{
							options = prepareOpt(SizeValues.key,SizeValues.val());
        					vetorzin.push(options);
        				}
        			});
        			var choices = prepareChoice(messageVec,vetorzin);

        			vetorzon.push(choices);
        		});
        		console.log(JSON.stringify(vetorzon));
        		message = prepareQRMsg(vetorzon[1])
        	}
        	res.json(message);
        	return null;
		}).catch(error => {
			console.log(error);
			let responseJson = prepareError();
			res.json(responseJson);
		});
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
	}
	var productPreview = {
    	"title":productName,
       	"image_url":productImage,
    	"subtitle":productValue,
      	"buttons":[{
     		"type":"postback",
        	"title":"Comprar",
        	"payload":"postback buy "+ productName
        },
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

function newOrder(id, source, store){
	let orderRef = firebase.database().ref('stores/'+store+'/orders');
	let newOrder = orderRef.push();
	newOrder.set({
		"userId": id,
		"products":[{}]
	});
}

function retrieveUserData(id, source, store){
	let data = firebase.database().ref('stores/'+store+'/clients/'+id);
	data.once('value').then(function(snapshot){
		if(snapshot.exists()){

		}
		else{
			let clientRef = firebase.database().ref('stores/'+store+'/clients');
			let newClient = clientRef.push();
			newClient.set({

			});
		}
	});
}