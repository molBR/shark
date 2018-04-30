module.exports={

	saveProduct: function (productRef, product, res) {
		productRef.set({
				"image":product.imagem,
				"description":product.desc,
				"valueType":product.tipoValor
			});
		res.json({"resposta":"ok"});
		return null;
	}
};