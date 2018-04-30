
module.exports={

	storeInfo: function (data, res, store) {
		let storeData = {};
		data.once("value").then(function(snapshot) {
			storeData.facebook = snapshot.child('facebook').val();
			storeData.instagram = snapshot.child('instagram').val();
			storeData.email = snapshot.child('email').val();
			storeData.phones = snapshot.child('phone').val();
			storeData.whatsapp = snapshot.child('whatsapp').val();
			storeData.end = snapshot.child('end').val();
			storeData.funcionamento = snapshot.child('funcionamento').val();
			storeData.payment = {};
			storeData.payment.boleto = snapshot.child('payment/boleto');
			storeData.payment.cartao = snapshot.child('payment/cartao');
			storeData.payment.cheque = snapshot.child('payment/cheque');
			storeData.payment.dinheiro = snapshot.child('payment/dinheiro');
			storeData.payment.link = snapshot.child('payment/link');
			storeData.payment.bandeiras = snapshot.child('payment/band');
			storeData.payment.bandAlim = snapshot.child('payment/banAlim');

			res.json(storeData);
			return null;
		}).catch(error => {
			console.error(error);
			res.json({});
		});	
	},

	storeProducts: function (data, res, store){
		let storeData = {};
		let products = [];
		storeData.categories=[];
		data.once("value").then(function(snapshot) { 
			snapshot.forEach(function(snapshotProduct){
				let product = {};
				product.name = snapshotProduct.key;
				product.description = snapshotProduct.child('description').val();
				product.type = snapshotProduct.child('valueType').val();
				product.value = '';
				product.image = snapshotProduct.child('image').val();
				product.categories = [];
				snapshotProduct.child('categories').forEach(function(snapshotCategory){
					if(snapshotCategory.val() === true){
						product.categories.push(snapshotCategory.key);
					}
				});

				if(product.type === 'simple'){
					product.value = snapshotProduct.value;
				}
				else{
					product.values = [];
					snapshotProduct.child('values').forEach(function(snapshotValue){
						let choice = {};
						choice.name = snapshotValue.key;
						choice.options = [];
						snapshotValue.child('options').forEach(function(snapshotOption){
							let option = {};
							snapshotOption.forEach(function(snapshotOptionValue){
								if(snapshotOptionValue.key === 'name'){
									option.size = snapshotOptionValue.val();
								}
								else{
									option.name = snapshotOptionValue.key;
									console.log(JSON.stringify(option.name));
									option.value = snapshotOptionValue.val();
								}
							});
							choice.options.push(option);
						});
						product.values.push(choice);
					});
				}
				products.push(product);
				
			});
			storeData.products = products;
			res.json(storeData);
			return null;
		}).catch(error => {
			console.error(error);
			res.json({});
		});	
	},

	storeBasicInfo: function (data, res, store){
		let storeData = {};
		data.once("value").then(function(snapshot) {
			storeData.agendamento = snapshot.child('schedule').val();
			storeData.aberto = snapshot.child('open').val();
			storeData.tipoLoja = snapshot.child('type').val();
			storeData.categories = snapshot.child('categories').val();
			console.log(JSON.stringify(storeData));
			res.json(storeData);
			return null;
		}).catch(error => {
			console.error(error);
			res.json({});
		});	
	},

	storeHistory: function (data, id, res, store){
		let storeData = {};
		storeData.pedidos = [];
		data.orderByChild("usuario").equalTo(id).once("value").then(function(snapshot) {
			snapshot.forEach(function(snapshotOrder){
				let order = {};
				order.produtos = snapshotOrder.child('products').val();
				order.pagamento = snapshotOrder.child('pagamento').val();
				storeData.pedidos.push(order);
			});
			res.json(storeData);
			return null;
		}).catch(error => {
			console.error(error);
			res.json({});
		});	
	},
	storeDepoimentos: function (data, res, store){
		let storeData = {};
		data.once("value").then(function(snapshot) {
			storeData.depoimentos = [];
			snapshot.forEach(function(snapshotDepoimentos){
				let depoimento = {};
				let date = new Date(parseInt(snapshotDepoimentos.key));
				depoimento.nome = snapshotDepoimentos.child('nome').val();
				depoimento.depoimento = snapshotDepoimentos.child('depoimento').val();
				depoimento.classif = snapshotDepoimentos.child('classif').val();
				depoimento.data = date.getDate()+'/'+date.getMonth()+'/'+date.getFullYear();
				storeData.depoimentos.push(depoimento);
			});			
			res.json(storeData);
			return null;
		}).catch(error => {
			console.error(error);
			res.json({});
		});	
	}

};