
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
			storeData.site = snapshot.child('site').val();
			storeData.funcionamento = snapshot.child('funcionamento').val();
			storeData.pagamento = {};
			storeData.pagamento.formas = snapshot.child('payment/formas').val();
			storeData.funcionamentoTexto = snapshot.child('funcionamentoTexto').val();
			storeData.pagamento.bandeirasDeb = snapshot.child('payment/band').val();
			storeData.pagamento.bandeirasCre = snapshot.child('payment/bandCre').val();
			storeData.pagamento.bandAlim = snapshot.child('payment/bandAlim').val();
			storeData.cpfNota = snapshot.child('cpfNota').val();
			storeData.linkID = snapshot.child('linkID').val();
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
				product.tamanho = snapshotProduct.child('tamanho').val();
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
						choice.nome = snapshotValue.key;
						choice.message = snapshotValue.child('message').val();
						choice.min = snapshotValue.child('min').val();
						choice.max = snapshotValue.child('max').val();
						choice.options = [];
						snapshotValue.child('options').forEach(function(snapshotOption){
							let option = {};
							snapshotOption.forEach(function(snapshotOptionValue){
								option.nome = snapshotOptionValue.key;
								option.value = snapshotOptionValue.val();
								option.valueI = parseInt(snapshotOptionValue.val());
							
							});
							choice.options.push(option);
						});
						product.values.push(choice);
					});
				}
				product.adicionais=[];
				snapshotProduct.child('adicionais').forEach(function(snapshotAdicional){
					let adicional={};
					adicional.nome = snapshotAdicional.key;
					adicional.valor = snapshotAdicional.val();
					adicional.valorI = parseInt(snapshotAdicional.val());
					product.adicionais.push(adicional);
				});
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
			storeData.nome = snapshot.key;
			storeData.imagem = snapshot.child('imagem').val();
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

	storeHistory: function (data, res, store){
		let storeData = {};
		storeData.pedidos = [];
		data.once("value").then(function(snapshot) {
			snapshot.forEach(function(snapshotOrder){
				let order = {};
				order.produtos = snapshotOrder.child('produtos').val();
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
