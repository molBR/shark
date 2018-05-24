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
		let dataPlace = firebase.database().ref('stores/'+store+'/clients/'+userId+'/place');
		handleCEP(parameters,res,function(responseJson,event,end){ //Outra sincronia cabulosa
			if (event === "getEND"){
				dataPlace.set({
					"CEP" : parameters.cep,
					"logradouro" : end.logradouro,
					"bairro" : end.bairro,
					"cidade" : end.cidade
				});	
			}
			responseJson.followupEventInput = prepareFollowUpEvent(event);
			res.json(responseJson);	
		});
	}

	else if(action === 'gotEND'){
		let dataPlace = firebase.database().ref('stores/'+store+'/clients/'+userId+'/place');
		let numero = parameters.numero;
		let refComp = parameters.refComp;
		let responseJson = {};
		dataPlace.update({
			"numero" : numero,
			"refCom" : refComp
		});/*
		responseJson.followupEventInput = prepareFollowUpEvent("paymentMethod");
		res.json(responseJson);*/
		prepareCardPayment(store,res);	
	}

	else if(action === 'gotPaymentMethod'){

		let paymentMethod = parameters.paymentMethod;
		let dataPayment = firebase.database().ref('stores/'+store+'/clients/'+userId+'/orderTemp/payment');
		dataPayment.update({
		"method" : paymentMethod
		});
		if (paymentMethod === "dinheiro"){
			res.json({"followupEventInput" : prepareFollowUpEvent("wantsChange")});
		}else{
			let dataOrder = firebase.database().ref('stores/'+store+'/clients/'+userId+'/orderTemp');
			let responseJson = prepareReceipt(res, dataOrder, source);
		}
	}
	else if (action === 'gotChange'){
		let change = parameters.change;
		localDot = change.indexOf(".");
		if(localDot !== -1){
			if((change.length	- localDot) === 2){
				change = change + "0";
			}else if ((change.length - localDot) > 2)
			{
				change = change.substring(0,(localDot+3))
			}
		}
		let dataPayment = firebase.database().ref('stores/'+store+'/clients/'+userId+'/orderTemp/payment');
		//let dataOrder = firebase.database().ref('stores/'+store+'/clients/'+userId+'/orderTemp');
		let dataOrder = firebase.database().ref('stores/'+store+'/clients/'+userId);
		let dataPlace = firebase.database().ref('stores/'+store+'/clients/'+userId+'/place');
		dataPayment.update({
			"change" : change
		});
		prepareReceipt(res, dataPlace, dataOrder,source);

	}
});


function prepareReceipt(res, dataPlace, dataOrder, source){
	let elements = [];
	dataOrder.once('value').then(function(snapshotOrder){
		let paymentMethod = snapshotOrder.child('orderTemp/payment/method').val();
		let CEP = snapshotOrder.child('place/CEP').val(); 
		let cidade = snapshotOrder.child('place/cidade');
		let logradouro = snapshotOrder.child('place/logradouro');
		let numero = snapshotOrder.child('place/numero');
		let refCom = snapshotOrder.child('place/refCom');
		snapshotOrder.child('orderTemp/produtos').forEach(function(snapshotProduct){
			let element ={
				"title":snapshotProduct.child('produto/name').val(),
				"subtitle":'',
				"quantity":snapshotProduct.child('produto/quantity').val(),
				"price":snapshotProduct.child('produto/value').val(),
				"currency":"BRL",
				"image_url":"http://res.cloudinary.com/uaihome/image/upload/"+snapshotProduct.child('produto/link').val()
			}
			elements.push(element);

		});
		let message = [{
			"payload" : {
				"facebook" : {
					"attachment":{
						"type":"template",
						"payload":{
							"template_type":"receipt",
							"recipient_name":"Fulano", //facebook request get name
							"order_number":"001", 
							"currency":"BRL",
							"payment_method":paymentMethod,       
							"address":{ // end recolhido
								"street_1":logradouro,
								"street_2":refCom,
								"city":cidade,
								"postal_code":CEP,
								"state":"MG",
								"country":"BR"
							},
							"summary":{ // valores
								"subtotal":100,
								"shipping_cost":10,
								"total_cost":110
							},
							"elements":elements
						}
					}  
				}
			}
		}];

		let responseJson = {};
		if (source === "facebook") {
			responseJson.fulfillmentMessages = message;
		} 

		else {
			responseJson = {fulfillmentText: message.fulfillmentText}; 
		}
		res.json(responseJson);
		return null;
	}).catch(error => {
		console.error(error);
		let responseJson = prepareError();
		res.json(responseJson);
	});
		     
}

function prepareCardPayment(store,res){
	let dataPay = firebase.database().ref('stores/'+store+'/info/payment/formas');
	dataPay.once("value").then(function(snapshotPay){
		let quickR = [];
		snapshotPay.forEach(function(snapForPay){

			quickR.push(prepareOpt(snapForPay.val(), 'paymentType '+snapForPay.val()));
		});

		let quickReply = prepareChoice("Como você gostaria de pagar?", quickR);
		let responseJson = {};
		responseJson.fulfillmentMessages = [];
		let message = 
		{
			"payload":{
				"facebook":quickReply
			}
		};
		responseJson.fulfillmentMessages.push(message);
		res.json(responseJson);
		return null;
	}).catch(error => {
			console.error(error);
			let responseJson = prepareError();
			res.json(responseJson);
		});	
}

	/*
function prepareCardConfirm(store, userI){
	let dataPlace = firebase.database().ref('stores/'+store+'/clients/'+userId+'/place');
	let dataOrder = firebase.database().ref('stores/'+store+'/clients/'+userId+'/orderTemp');
	dataPlace.once("value").then(function(snapshotPlace){
		dataOrder.once("value").then(function(snapshotOrder){

		})
	});


}
*/
function handleCEP(parameters,res,callback){
	let event;
	let responseJson = {};
	let end = {};
	end.cep = parameters.cep;

	request('http://api.postmon.com.br/v1/cep/'+end.cep, function (error, response, body) { //validar o cep

		
		if(String(response.statusCode) === "200"){
			body = JSON.parse(body);
			if (body.cidade !== "Itabira"){
				event = "endCONV";//não existe o cep
				responseJson.fulfillmentText = "Desculpe, nós não atendemos nessa cidade";
			}else{
				end.logradouro = body.logradouro;
				end.bairro = body.bairro;
				end.cidade = body.cidade;
				event = "getEND";//segue o jogo
			}
		}
		else if(String(response.statusCode) === "404"){
			event = "getCEP"; //não existe o cep
			responseJson.fulfillmentText = "CEP incorreto, digite novamente";
		}
		callback(responseJson,event,end);
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
	    		console.log("to aqui brother")
	    		prepareCardPayment(store,res);
	    	}else{
	    		console.log("Nao deveria estar aqui brother");
	    		res.json({"followupEventInput" : prepareFollowUpEvent("getCEP")});	    	}
	    	return null;
	    }).catch(error =>{
	    	console.error(error);
	    	let responseJson = prepareError();
	    	res.json(responseJson);
	    });

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

	else if (action === 'getBairros'){
		let data = firebase.database().ref('stores/'+store+'/bairros');
		getFunctions.storeBairros(data, res, store);
	}	
});

exports.webappSave = functions.https.onRequest((req, res) => { //Toda vez que surgir um http request...
	
	var saveFunctions = require('./saveFunctions.js');
	let store = req.body.store;
	let action = req.body.action;
	if(action === 'saveProduct'){
		let product = req.body.product;
		console.log(JSON.stringify(product));
		let productRef = firebase.database().ref('stores/'+store+'/products/'+product.nome);
		saveFunctions.saveProduct(productRef, product, res);
	}
	else if(action === 'saveBasicInfo'){
		let storeParameters = req.body;
		let storeEndRef = firebase.database().ref('stores/'+store+'/info');
		let storeBasicRef = firebase.database().ref('stores/'+store+'/basicInfo');
		saveFunctions.saveBasicInfo(storeBasicRef, storeEndRef, storeParameters);
		res.json({'resposta':'ok'});
	}
	else if(action === 'saveInfo'){
		let storeParameters = req.body;
		let storeInfoRef = firebase.database().ref('stores/'+store+'/info');
		saveFunctions.saveInfo(storeInfoRef, storeParameters);
		res.json({'resposta':'ok'});
	}

	else if(action === 'saveBairro'){
		let bairro = req.body.bairro;
		let valor = req.body.valor;
		let subAction = req.body.subAction;
		let bairrosRef = firebase.database().ref('stores/'+store+'/bairros');
		let bairroRef = firebase.database().ref('stores/'+store+'/bairros/'+bairro);
		let bairrosDeleteRef = firebase.database().ref('stores/'+store+'/bairrosDelete/'+bairro);
		let bairrosTempRef;
		
		if(subAction === 'save'){
			bairrosTempRef = firebase.database().ref('stores/'+store+'/bairrosTemp');
			bairrosDeleteRef = firebase.database().ref('stores/'+store+'/bairrosDelete');
			saveBairro(bairrosTempRef, bairrosDeleteRef, store, res);
		}
		else{
			bairrosTempRef = firebase.database().ref('stores/'+store+'/bairrosTemp/'+bairro);
			saveFunctions.saveBairro(subAction, res, bairroRef, bairrosRef, bairrosTempRef, bairrosDeleteRef, bairro, valor);
		}
	}

	else if(action === 'saveFuncionamento'){
		let funcionamentoTurnos = req.body.funcionamento;
		let funcionamentoRef = firebase.database().ref('stores/'+store+'/info');
		let funcionamentoTexto = req.body.funcionamentoTexto;
		let storeInfoRef = firebase.database().ref('stores/'+store+'/info');
		saveFunctions.saveFuncionamento(res, storeInfoRef, funcionamentoTexto, funcionamentoRef, funcionamentoTurnos);
	}

	else if(action === 'savePagamento'){
		let pagamentoParameters = req.body;
		let subAction = req.body.subAction;
		let pagamentoRef = firebase.database().ref('stores/'+store+'/info/payment');
		saveFunctions.savePagamento(res, pagamentoParameters, pagamentoRef);
	}
});

function saveBairro(bairrosTempRef, bairrosDeleteRef, store, res){
	bairrosTempRef.once("value").then(function(snapshot) {
		snapshot.forEach(function(snapshotBairros){
			let snapshotRef = firebase.database().ref('stores/'+store+'/bairros/'+snapshotBairros.key);
			snapshotRef.update({
				"bairro":snapshotBairros.key,
				"valor":snapshotBairros.child('valor').val()
			});
		});
		bairrosDeleteRef.once("value").then(function(snapshotDelete) {
			snapshotDelete.forEach(function(snapshotBairrosDelete){
				let snapshotDeleteRef = firebase.database().ref('stores/'+store+'/bairros/'+snapshotBairrosDelete.key);
				snapshotDeleteRef.remove();
			});
			bairrosTempRef.remove();
			res.json({'resposta':'ok'});
			return null;
		}).catch(error => {
			console.error(error);
		});
		return null;
	}).catch(error => {
		console.error(error);
	});
		
}
			