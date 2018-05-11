const functions = require('firebase-functions'); //funcoes da api firebase
const Produto = require('./produtoClass.js'); //classe de cadastro de produto
const orderClass = require ('./orderClass.js'); //classe de cadastro de ordem
const admin = require('firebase-admin'); //autenticacao firebase
var firebase = admin.initializeApp(functions.config().firebase); //objeto para interacao com o firebase 
var request = require('request');

exports.alimentos = functions.https.onRequest((req, res) => { //Toda vez que surgir um http request...
	
	let action = req.body.queryResult.action; //intenção do usuário ao interagir com o firebase
	let parameters = req.body.queryResult.parameters; //parametros do pedido do usuario
	let store = req.headers.store; //loja em que o cliente está pedindo
	let source = req.body.originalDetectIntentRequest.source; //qual rede social que o pedido vem
	let elements = []; //elementos dos produtos 
	let userId =  req.body.originalDetectIntentRequest.payload.sender.id; //Id do cliente que esta pedindo
	if(action === 'searchProduct'){ //procura o produto no banco de dados
		let product = parameters.produto;
		let data = firebase.database().ref('stores/'+store+'/products/'+product); 
		data.once("value").then(function(snapshot) {
			elements.push(prepareMessage(snapshot)); 
			let responseJson = prepareResponse(elements, source); 
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
			res.json(responseJson);
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
				res.json(responseJson);
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
    			let choicesPreview = [];
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
    		let responseJson = prepareFollowUpEvent(choice);
    		res.json(responseJson);
    		return null
    	}).catch(error => {
			console.error(error);
			let responseJson = prepareError();
			res.json(responseJson);
		});	
    }

    else if(action === 'buySimple'){
		let product = parameters.produto;
		let quantity = parameters.quantity;
		let more = parameters.more;
		let value = parameters.value;
		let link = parameters.link
		let prodiVT = "simple";
    	//prod = new Produto(product,quantity,value);
    	prod = {
    		"name" : product,
    		"quantity" : quantity,
    		"value" : value,
    		"link" : link,
    		"prodiVT" : prodiVT
    	};
    	insertProduto(store,userId,prod,res,function(){ //Sincronia cabulosa.
	    	if(more==="não"){
	    		insertOrder(store,userId,res,prodiVT,source);
	    	}else{
	    		responseJson = {fulfillmentText: "Por favor, peça o próximo pedido"};
				res.json(responseJson);
	    	}
    	});
	}

	else if (action === 'quantityChange')
	{
		let dataInsert = firebase.database().ref('stores/'+store+'/clients/'+userId+'/orderTemp/produtos');
		dataInsert.once("value").then(function(snapshot){
			snapshot.forEach(function(snapProd){
				if (parameters.produto===snapProd.child("produto/name").val()){
					let DataUpdate = firebase.database().ref('stores/'+store+'/clients/'+userId+'/orderTemp/produtos/'+snapProd.key+"/produto")
					DataUpdate.update({"quantity" : parameters.quantity});
				}
			});
			res.json("Pedido atualizado!" + parameters.produto + ":" + parameters.quantity);
			return null;
		}).catch(error => {
			console.error(error);
			let responseJson = prepareError();
			res.json(responseJson);
		});	
	}else if (action === 'removeProd'){
		let dataSearch = firebase.database().ref('stores/'+store+'/clients/'+userId+'/orderTemp/produtos');
			dataSearch.once("value").then(function(snapshot){
				snapshot.forEach(function(prodEach){
					if (prodEach.child("produto/name").val() === parameters.produto){
						let dataRemove = firebase.database().ref('stores/'+store+'/clients/'+userId+'/orderTemp/produtos/'+prodEach.key);
						dataRemove.remove();
					}
				});
			res.json("sei la mermao");
			return null;
			}).catch(error => {
				console.error(error);
				let responseJson = prepareError();
				res.json(responseJson);
			});
	}
	else if(action === 'FinalizaCompra'){
		console.log("FINALIZANDO A COMPRA MALUCO!!!!!!!!");	
		let dataInsert = firebase.database().ref('stores/'+store+'/clients/'+userId+'/orderTemp/produtos');
		let dataRemove = firebase.database().ref('stores/'+store+'/clients/'+userId+'/orderTemp');
		let dataReceive = firebase.database().ref('stores/'+store+'/clients/'+userId+'/orders');
		let time = Date.now();
		dataInsert.once("value").then(function(snapshot){
			let vetorProd = [];
			let vetorCar = [];
			snapshot.forEach(function(snapProd){
			let Order = new orderClass(JSON.stringify(snapshot.child('produtos')),userId,Date.now());
			let prodi = snapProd.child('produto').val();
			let prodiName = prodi.name;
			let prodiQuant = prodi.quantity
			let prodiValue = prodi.value;
			let prodiLink = prodi.link;
			let prodiVT = prodi.prodiVT;
			let prod = {
				"name": prodiName,
				"quantity" : prodiQuant,
				"value" : prodiValue,
				"image" : "http://res.cloudinary.com/uaihome/image/upload/"+prodiLink,
				"productValueType" : prodiVT};
			vetorProd.push(prod);
		});
		let dataRecieveNew = dataReceive.push();
		dataRecieveNew.set({
				"Usuario " : userId,
				"produtos" : vetorProd,
				"Tempo" : time
			});
		dataRemove.remove();
		return null;
		}).catch(error => {
				console.error(error);
			let responseJson = prepareError();
			res.json(responseJson);
		});

	}

	else if(action === 'gotCEP'){
		handleCEP(parameters,res,function(responseJson,event){ //Outra sincronia cabulosa
			responseJson.followupEventInput = prepareFollowUpEvent(event);
			console.log(JSON.stringify(responseJson));
			res.json(responseJson);	
		});
	}

	else if(action === 'gotEND'){
		let numero = parameters.numero;
		let refCom = parameters.refCom;
		console.log("OLHA OS PARAMETRO BRO: " + JSON.stringify(parameters));
	}

});


function handleCEP(parameters,res,callback){
	let event;
	let responseJson = {};
	let end = {};
	end.cep = parameters.cep;

	request('http://api.postmon.com.br/v1/cep/'+end.cep, function (error, response, body) { //validar o cep
		console.log(body);
		body = JSON.parse(body);
		if (body.cidade !== "Itabira"){
			event = "getCEP"; //não existe o cep
			responseJson.fulfillmentText = "Desculpe, nós não atendemos nessa cidade";
		}
		else if(String(response.statusCode) === "200"){
			end.logradouro = body.logradouro;
			end.bairro = body.bairro;
			end.cidade = body.cidade;
			event = "getEND";//segue o jogo
		}
		else if(String(response.statusCode) === "404"){
			event = "getCEP"; //não existe o cep
			responseJson.fulfillmentText = "CEP incorreto, digite novamente";
		}
		callback(responseJson,event);
	});
	
}



function insertOrder(store,userId,res,prodiVT,source){
	let dataInsert = firebase.database().ref('stores/'+store+'/clients/'+userId+'/orderTemp/produtos');
	let dataReceive = firebase.database().ref('stores/'+store+'/clients/'+userId+'/orders');
	let dataRemove = firebase.database().ref('stores/'+store+'/clients/'+userId+'/orderTemp');
	let dataPlace = firebase.database().ref('stores/'+store+'/clients/'+userId+'/place');
	let time = Date.now();
		dataInsert.once("value").then(function(snapshot){
			let vetorProd = [];
			let vetorCar = [];
			snapshot.forEach(function(snapProd){
			let Order = new orderClass(JSON.stringify(snapshot.child('produtos')),userId,Date.now());
			let prodi = snapProd.child('produto').val();
			let prodiName = prodi.name;
			let prodiQuant = prodi.quantity
			let prodiValue = prodi.value;
			let prodiLink = prodi.link;
			let prod = {
				"name": prodiName,
				"quantity" : prodiQuant,
				"value" : prodiValue,
				"image" : "http://res.cloudinary.com/uaihome/image/upload/"+prodiLink,
				"productValueType" : prodiVT};
			vetorProd.push(prod);

	});
	/*	let dataRecieveNew = dataReceive.push();
		dataRecieveNew.set({
				"Usuario " : userId,
				"produtos" : vetorProd,
				"Tempo" : time
			});
		dataRemove.remove();*/ //COMENTADO PARA DEIXAR NO ORDER TEMP
	    vetorProd.forEach(function(prodVet){
	    	vetorCar.push(cartMessage(prodVet));
	    });
	    var PR = {};
	    let quickReplyOption = [];
	    quickReplyOption.push(prepareOpt("finalizar","payload finalizar compra"));
	    let quickR = prepareChoice("Ou,",quickReplyOption);
						        
	    //PR.fulfillmentMessages = prepareResponseCart(vetorCar,source,quickR).fulfillmentMessages; //mostrar carro
	    dataPlace.once("value").then(function(place){
	    	if(place.exists()){
	    		console.log("Existe");
	    	}else{
	    		console.log("Não");
	    	}
	    	return null;
	    }).catch(error =>{
	    	console.error(error);
	    	let responseJson = prepareError();
	    	res.json(responseJson);
	    });
	    res.json({"followupEventInput" : prepareFollowUpEvent("getCEP")});
	    //res.json(PR);
		return null;
		
	}).catch(error => {
			console.error(error);
			let responseJson = prepareError();
			res.json(responseJson);
		});	
}

function insertProduto(store,userId,produto,res,callback){
	let data = firebase.database().ref('stores/'+store+'/clients/'+userId+'/orderTemp');
	let data1 = firebase.database().ref('stores/'+store+'/clients/'+userId+'/orderTemp/produtos');
	data.once("value").then(function (snapshot)
	{
		let tempProd = snapshot.child("hora").val()
		let agora = Date.now()
		let diferenca = agora - tempProd;
		if(!snapshot.exists() || (snapshot.exists()&&diferenca>=1800000)){
			data.set({
				"hora" : Date.now()
			});
			let datanew = data1.push();
			datanew.set({
				produto
			});
		}else{
			snapshot.child("produtos").forEach(function(singleProd){

				nomeProd = JSON.stringify(singleProd.child("produto/name").val());
				if(nomeProd !==	JSON.stringify(produto.name)){
					let datanew = data1.push();
					datanew.set({
						produto
					});
				}else{
					let DataUpdate = firebase.database().ref('stores/'+store+'/clients/'+userId+'/orderTemp/produtos/'+singleProd.key+"/produto");
					valorTotal = +singleProd.child("produto/quantity").val() + +produto.quantity;
					DataUpdate.update({"quantity" : valorTotal});
				}
			});
		}
		callback();
		return null;
	}).catch(error => {
			console.error(error);
			let responseJson = prepareError();
			res.json(responseJson);
		});	
}

function prepareFollowUpEvent(event){
	var	message = {
		"name" : event,
		"languageCode" : "pt-BR"
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
	    "title":snapshotResponse1,
	    "payload":snapshotResponse2					        
	};
	return options;
}

function prepareMessage(snapshotProduct, store){
	let productDescription = snapshotProduct.child("description").val();
	let productType = snapshotProduct.child('type').val();
	let productImage = snapshotProduct.child('image').val();
	let productName = snapshotProduct.key;
	let productValueType = snapshotProduct.child('valueType').val();
	let productValue = "";
	let buyButton;
	
	productLink = productImage.substring(46,productImage.length);
	if(productValueType === 'simple'){
		productValue = 'R$ '+snapshotProduct.child('value').val(); 
		buyButton = {
			"type":"postback",
        	"title":"COMPRAR",
        	"payload":"postback buySimple "+ productName + " " + snapshotProduct.child('value').val() + " " + productLink
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

function prepareResponseCart(elements, source, quickR){
	let message = {
		"fulfillmentMessages": [{
			"payload": {
				"facebook":{
					"text":"Confira o seu pedido: "
    			}
			}
		},{
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
		},{
			"payload":{
				"facebook":quickR
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
    console.log(JSON.stringify(responseJson));
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
		res.json(responseJson);
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
			let clientRef = firebase.database().ref('stores/'+store+'/clients/'+userId);
			clientRef.set({
				"nome" : "indeterminado" 
			});
		}
		return null;
	}).catch(error => {
		console.error(error);
		let responseJson = prepareError();
		res.json(responseJson);
	});				
}

function cartMessage(order){
  let productChoices = "";
  let buttons;

  if(order.productValueType === 'simple'){
    buttons = [
    	{
          "type":"postback",
          "title":"Mudar Quantidade",
          "payload":"quantityChange "+order.name
        },
        {
          "type":"postback",
          "title":"Retirar do carrinho",
          "payload":"deleteProduct "+order.name
        },
       	{
        	"type":"postback",
        	"title":"Finalizar Pedido",
        	"payload":"FinalizaCompra"
        }]; //Aqui que edita bro
  }
  else{
	  Object.keys(order.choices).forEach(function(key){
	    productChoices += key+': '+order.choices[key]+'\n';
	  });
    buttons = [
    {
          "type":"postback",
          "title":"Mudar Quantidade",
          "payload":"quatityChange "+order.name
        },
        {
          "type":"postback",
          "title":"Mudar Opções",
          "payload":"optionsChange "+order.name
        },
        {
          "type":"postback",
          "title":"Retirar",
          "payload":"deleteProduct "+order.name
        }];
  }
  var productPreview = {
      "title":order.name,
        "image_url":order.image,
      "subtitle":productChoices,
        "buttons": buttons
    };

    return productPreview;
}

exports.webapp = functions.https.onRequest((req, res) => { //Toda vez que surgir um http request...
	var getFunctions = require('./getFunctions.js');
	let store = req.body.store;
	let action = req.body.action;

	if(action === 'getStoreProducts'){
		let data = firebase.database().ref('stores/'+store+'/products');
		getFunctions.storeProducts(data, res, store);
	}	
	else if(action === 'getStoreBasicInfo'){
		let data = firebase.database().ref('stores/'+store+'/basicInfo');
		getFunctions.storeBasicInfo(data, res, store);
	}
	else if(action === 'getStoreInfo'){
		let data = firebase.database().ref('stores/'+store+'/info');
		getFunctions.storeInfo(data, res, store);
	}

	else if (action === 'getHistory'){
		let id = req.body.id;
		let data = firebase.database().ref('stores/'+store+'/clients/'+id+'/orders');
		getFunctions.storeHistory(data, res, store);
	}

	else if (action === 'getDepoimentos'){
		let data = firebase.database().ref('stores/'+store+'/depoimentos');
		getFunctions.storeDepoimentos(data, res, store);
	}	
});

exports.webappSave = functions.https.onRequest((req, res) => { //Toda vez que surgir um http request...
	
	var saveFunctions = require('./saveFunctions.js');
	let store = req.body.store;
	let action = req.body.action;
	console.log(JSON.stringify(req.body));
	if(action === 'saveProduct'){
		let product = req.body.product;
		console.log(JSON.stringify(product));
		let productRef = firebase.database().ref('stores/'+store+'/products/'+product.nome);
		saveFunctions.saveProduct(productRef, product, res);
	}
	res.json({"resposta":"nãoOK"});

});
			