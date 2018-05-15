module.exports={
	carrouselTemplate: function(elements){
		let carrouselT = {
			"attachment":{
				"type":"template",
				"payload":{
						"template_type":"generic",
						"elements":elements
				}
			}
		};
		return carrouselT;
	},

	cardCarrouselTemplate: function(product, buttons){
		var card = {
	    	"title":product.name,
	       	"image_url":product.image,
	    	"subtitle":product.value,
	      	"buttons":buttons
	    };
	},

	postbackButtonTemplate: function(title, payload){
		var button = {
			"type":"postback",
	    	"title":title,
	    	"payload": payload
	    };
	},

	quickReplyTemplate: function(question, quickReply){
		var choices = {
			"text": question,
			"quick_replies":quickReply
		};

		return choices;
	},

	quickReplyOption: function(title,payload){
		var options = {
			"content_type":"text",
		    "title":title,
		    "payload":payload					        
		};
		return options;
	},

	receiptTemplate: function(snapshotOrder){
		let elements = [];
		let paymentMethod = snapshotOrder.child('payment/method').val();
		console.log(JSON.stringify(snapshotOrder));
		snapshotOrder.child('produtos').forEach(function(snapshotProduct){
			let element ={
				"title":snapshotProduct.child('name').val(),
				"subtitle":'',
				"quantity":snapshotProduct.child('quantity').val(),
				"price":snapshotProduct.child('value').val(),
				"currency":"BRL",
				"image_url":"http://res.cloudinary.com/uaihome/image/upload/"+snapshotProduct.child('link').val()
			}
			elements.push(element);
		});
		let message = {
			"attachment":{
				"type":"template",
				"payload":{
					"template_type":"receipt",
					"recipient_name":"Fulano", //facebook request get name
					"order_number":"001", 
					"currency":"BRL",
					"payment_method":paymentMethod,       
					"address":{ // end recolhido
						"street_1":"Rua Tiradentes",
						"street_2":"",
						"city":"Itabira",
						"postal_code":"35900013",
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
		};

		return message;
	},

	customPayload: function(fulfillmentMessage){
		let response = {
			"payload": {
				"facebook":fulfillmentMessage
			}
		};
		return response;
	}

};