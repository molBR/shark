
module.exports={
	getProduct: function(snapshotProduct, source){
		let facebookPayloads = require('./facebookPayloads.js');
		let card
		let produto = {}
		produto.description = snapshotProduct.child("description").val();
		produto.type = snapshotProduct.child('type').val();
		produto.image = snapshotProduct.child('image').val();
		produto.name = snapshotProduct.key;
		produto.valueType = snapshotProduct.child('valueType').val();
		produto.value = "";
		produto.link = produto.image.substring(46,produto.image.length);
		if(snapshotProduct.child('tamanho').exists()){
			snapshotProduct.child('tamanho/options').forEach(function(options){
				produto.value += options.child('size').val()+'- R$'+options.child('value').val()+'\n';	
			});
		}		
		else{
			produto.value = 'R$ '+snapshotProduct.child('value').val();		
		}

		if(source === 'facebook'){
			buttons = [];
			buttons.push(facebookPayloads.postbackButtonTemplate("COMPRAR", "Comprar "+produto.name));
			buttons.push(facebookPayloads.postbackButtonTemplate("Detalhes", "Detalhes "+produto.name));
			card = facebookPayloads.cardCarousselTemplate(produto, buttons);
		}

		else{
			card = "nothing till now";
		}

		return card;
	}
};