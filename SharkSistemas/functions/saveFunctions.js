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

	saveStore: function (storeRef, storeParams){
		storeRef.update({
			'basicInfo':{
				'imagem':storeParams.basicInfo.imagem,
				'schedule':storeParams.basicInfo.schedule,
				'type':storeParams.basicInfo.type
			},
			'info':{
				'cpfNota':storeParams.info.cpfNota,
				'email':storeParams.info.email,
				'end': storeParams.info.end,
				'facebook':storeParams.info.facebook,
				'funcionamentoTexto':storeParams.info.funcionamentoTexto,
				'instagram':storeParams.info.instagram,
				'linkID':storeParams.info.linkID,
				'credito':storeParams.info.credito,
				'debito':storeParams.info.debito,
				'dinheiro':storeParams.info.dinheiro,
				'alimentacao':storeParams.info.alimentacao,
				'link':storeParams.info.link,
				'phone':storeParams.info.phone,
				'site':storeParams.info.site,
				'whatsapp':storeParams.info.whatsapp
			}
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

	saveFuncionamento: function (res, funcionamentoRef, funcionamentoTurnos){
		funcionamentoRef.update({
				"funcionamento":funcionamentoTurnos
			});
		res.json({"resposta":"OK"});
		return null;
	},

	saveBandeira: function (res, bandeirasCred, bandeirasDeb, bandeirasAli, bandeiraRef){
		bandeiraRef.update({
			'bandeirasCred':{
				'MasterCard':bandeirasCred.mastercard,
				'Visa':bandeirasCred.visa,
				'Elo':bandeirasCred.elo,
				'Diners Club International':bandeirasCred.diners,
				'HiperCard':bandeirasCred.hipercard,
				'Sodexo':bandeirasCred.sodexo,
				'American Express':bandeirasCred.americanexpress,
				'JCB':bandeirasCred.jcb
			},
			'bandeirasDeb':{
				'MasterCard':bandeirasDeb.mastercard,
				'Visa':bandeirasDeb.visa,
				'Elo':bandeirasDeb.elo,
				'Diners Club International':bandeirasDeb.diners,
				'HiperCard':bandeirasDeb.hipercard,
				'Sodexo':bandeirasDeb.sodexo,
				'American Express':bandeirasDeb.americanexpress,
				'JCB':bandeirasDeb.jcb
			},
			'bandeirasAli':{
				'Alelo':bandeirasAli.alelo,
				'VR Refeição':bandeirasAli.vr,
				'Sodexo':bandeirasAli.sodexo,
				'Ticket Restaurante':bandeirasAli.ticket
			}
		});
		res.json({"resposta":"OK"});
		return null;

	}
};

