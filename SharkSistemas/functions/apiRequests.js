var request = require('request');

module.exports = {
	getUserName: function(userId){
		let access_token = 'EAAB3rX5tR00BAE2Ko93KH49ZAfgK2KrjeibC3GJ5F6cFigYm8uKlKnJ0B80fVYMyEleSg1qJi2GIRH1FEVHFrCg3es77NHwvbVUtjBoW3oNZBmzkQjYnXP7mVRVZB4mZAstvZAbNRSrdBzD7n9cIGGVTsY6TV7kK8sy4plvmTXgZDZD';
		request('https://graph.facebook.com/v2.6/'+userId+'?fields=first_name,last_name&access_token='+access_token, function (error, response, body) { //validar o cep
			let bodyP = JSON.parse(body);
			let name = bodyP.first_name+' '+bodyP.last_name;
			console.log(JSON.stringify(body));
			console.log('aqui'+JSON.stringify(response));
			console.log(name);
			return name;
		});
	},
	
};