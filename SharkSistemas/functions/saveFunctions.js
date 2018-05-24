module.exports={

	saveProduct: function (productRef, product, res) {
		productRef.set({
				"image":product.imagem,
				"description":product.desc,
				"valueType":product.tipoValor
			});
		res.json({"resposta":"ok"});
		return null;
	},

	saveBasicInfo: function (storeBasicRef, storeEndRef, storeParams){
		storeBasicRef.update({
			'nome':storeParams.nome,
			'imagem':storeParams.imagem,
			'type':storeParams.type
		});
		storeEndRef.update({
			'end':{
				'logradouro':storeParams.endLogradouro,
				'bairro':storeParams.endBairro,
				'numero':storeParams.endNumero,
				'complemento':storeParams.endComplemento,
				'cep':storeParams.endCEP
			}
		});
	},
	saveInfo: function (storeInfoRef, storeParams){
		storeInfoRef.update({
			'email':storeParams.email,
			'facebook':storeParams.facebook,
			'funcionamentoTexto':storeParams.funcionamentoTexto,
			'instagram':storeParams.instagram,
			'phone':storeParams.phone,
			'site':storeParams.site,
			'whatsapp':storeParams.whatsapp
		});
		return null;
	},

	saveBairro: function (subAction, res, bairroRef, bairrosRef, bairrosTempRef, bairroDeleteRef, bairroN, valor){
		let  storeData = {};
		if(subAction === 'add'){
			bairrosTempRef.update({
				"bairro":bairroN,
				"valor":valor
			});
		}
		else if(subAction === 'delete'){
			bairrosTempRef.once('value').then(function(snapshotDelete){
				if(snapshotDelete.exists()){
					bairrosTempRef.remove();
				}
				else{
					bairroDeleteRef.update({
						'bairro':bairroN
					});
				}
				bairrosTempRef.once("value").then(function(snapshotTemp) {
					storeData.bairros = [];
					snapshotTemp.forEach(function(snapshotBairrosTemp){
						let bairro = {};
						bairro.nome = snapshotBairrosTemp.child('bairro').val();
						bairro.valor = snapshotBairrosTemp.child('valor').val();
						storeData.bairros.push(bairro);
					});
					bairrosRef.once("value").then(function(snapshot) {
						snapshot.forEach(function(snapshotBairros){
							let bairro = {};
							bairro.nome = snapshotBairros.child('bairro').val();
							bairro.valor = snapshotBairros.child('valor').val();
							if(bairro.nome !== bairroN){
								storeData.bairros.push(bairro);
							}
						});			
						res.json(storeData);
						return null;
					}).catch(error => {
						console.error(error);
						res.json({});
					});
					return null;
				}).catch(error => {
					console.error(error);
					res.json({});
				});
				return null;
			}).catch(error => {
				console.error(error);
				res.json({});
			});
		
		}

		bairrosTempRef.once("value").then(function(snapshotTemp) {
			storeData.bairros = [];
			snapshotTemp.forEach(function(snapshotBairrosTemp){
				let bairro = {};
				bairro.nome = snapshotBairrosTemp.child('bairro').val();
				bairro.valor = snapshotBairrosTemp.child('valor').val();
				storeData.bairros.push(bairro);
			});
			bairrosRef.once("value").then(function(snapshot) {
				snapshot.forEach(function(snapshotBairros){
					let bairro = {};
					bairro.nome = snapshotBairros.child('bairro').val();
					bairro.valor = snapshotBairros.child('valor').val();
					storeData.bairros.push(bairro);
				});
				if(subAction === 'get'){
					bairrosTempRef.remove();
				}			
				res.json(storeData);
				return null;
			}).catch(error => {
				console.error(error);
				res.json({});
			});
			return null;
		}).catch(error => {
			console.error(error);
			res.json({});
		});
	},

	saveFuncionamento: function (res, storeInfoRef, funcionamentoTexto, funcionamentoRef, funcionamentoTurnos){
		funcionamentoRef.update({
			"funcionamento":funcionamentoTurnos
		});
		storeInfoRef.update({
			"funcionamentoTexto":funcionamentoTexto
		});
		res.json({"resposta":"OK"});
		return null;
	},

	savePagamento: function (res, pagamentoParameters, pagamentoRef){
		pagamentoRef.update({
			'bandeiras':{
				'bandeirasCred':{
					'MasterCard':pagamentoParameters.bandeirasCred.mastercard,
					'Visa':pagamentoParameters.bandeirasCred.visa,
					'Elo':pagamentoParameters.bandeirasCred.elo,
					'Diners Club International':pagamentoParameters.bandeirasCred.diners,
					'HiperCard':pagamentoParameters.bandeirasCred.hipercard,
					'Sodexo':pagamentoParameters.bandeirasCred.sodexo,
					'American Express':pagamentoParameters.bandeirasCred.americanexpress,
					'JCB':pagamentoParameters.bandeirasCred.jcb
				},
				'bandeirasDeb':{
					'MasterCard':pagamentoParameters.bandeirasDeb.mastercard,
					'Visa':pagamentoParameters.bandeirasDeb.visa,
					'Elo':pagamentoParameters.bandeirasDeb.elo,
					'Diners Club International':pagamentoParameters.bandeirasDeb.diners,
					'HiperCard':pagamentoParameters.bandeirasDeb.hipercard,
					'Sodexo':pagamentoParameters.bandeirasDeb.sodexo,
					'American Express':pagamentoParameters.bandeirasDeb.americanexpress,
					'JCB':pagamentoParameters.bandeirasDeb.jcb
				},
				'bandeirasAli':{
					'Alelo':pagamentoParameters.bandeirasAli.alelo,
					'VR Refeição':pagamentoParameters.bandeirasAli.vr,
					'Sodexo':pagamentoParameters.bandeirasAli.sodexo,
					'Ticket Restaurante':pagamentoParameters.bandeirasAli.ticket
				}
			},
			'cpfNota':pagamentoParameters.cpfNota,
			'linkID':pagamentoParameters.linkID,
			'credito':pagamentoParameters.credito,
			'debito':pagamentoParameters.debito,
			'dinheiro':pagamentoParameters.dinheiro,
			'alimentacao':pagamentoParameters.alimentacao,
			'link':pagamentoParameters.link
		});
		res.json({"resposta":"OK"});
		return null;

	}
};

