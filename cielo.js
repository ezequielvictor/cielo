var https = require('https'),
	iconv = require('iconv-lite'),
	util = require('util');

module.exports = function (params) {
	/**
	 * Caso o flag debug for true, retorna o log no console
	 */
	var log = function () {
		if (debug)
			console.log('------------ DEBUG ------------\n', new Date, '\n\n', arguments, '\n\n------------ END DEBUG ------------\n');
	}

	var debug = params.debug || false;

	var options = {
		hostname: 'api.cieloecommerce.cielo.com.br',
		port: 443,
		secureProtocol: 'TLSv1_method',
		encoding: 'utf-8',
		headers: {
			'Content-Type': 'application/json',
			'MerchantId': params.MerchantId,
			'MerchantKey': params.MerchantKey,
			'RequestId': params.RequestId || ''
		},
	};

	if (params.sandbox)
		options.hostname = 'apisandbox.cieloecommerce.cielo.com.br';

	function postSalesCielo(data) {
		return new Promise((resolve, reject) => {
			options.path = '/1/sales';
			options.method = 'POST';
			data = JSON.stringify(data);
			options.headers['Content-Length'] = Buffer.byteLength(data);
			log(options, data);

			var req = https.request(options, function (res) {
				res.on('data', function (chunk) {
					var data = iconv.decode(chunk, 'utf-8');
					try {
						data = JSON.parse(data);
					} finally {
						log(data);
						resolve(data);
					}
				});
			});
			req.write(data);
			req.on('error', function (err) {
				reject(err);
			});
			req.end();
		})
	}

	var captureSale = function (data) {
		log('captureSale', data)
		return new Promise((resolve, reject) => {
			options.path = util.format('/1/sales/%s/capture?amount=%s', data.paymentId, data.amount);

			if (data.serviceTaxAmount)
				options.path += util.format('/serviceTaxAmount=%s', data.serviceTaxAmount);

			options.method = 'PUT';
			data = JSON.stringify(data);
			options.headers['Content-Length'] = Buffer.byteLength(data);
			log(options, data);

			var req = https.request(options, function (res) {
				res.on('data', function (chunk) {
					var data = iconv.decode(chunk, 'utf-8');
					try {
						data = JSON.parse(data);
					} finally {
						log(data);
						resolve(data);
					}
				});
			});
			req.write(data);
			req.on('error', function (err) {
				reject(err);
			});
			req.end();
		})
	}

	/**
	 * Cancela a venda - Dá preferencia para cancelar pelo paymentId, se não existir, utiliza o OrderId
	 * @param {object} data 
	 * @param {callback} callback 
	 */
	var cancelSale = function (data) {
		return new Promise((resolve, reject) => {
			if (data.paymentId)
				options.path = util.format('/1/sales/%s/void?amount=%s', data.paymentId, data.amount)
			else
				options.path = util.format('/1/sales/OrderId/%s/void?amount=%s', data.merchantOrderId, data.amount);

			options.method = 'PUT';
			data = JSON.stringify(data);
			options.headers['Content-Length'] = Buffer.byteLength(data);
			log(options, data);

			var req = https.request(options, function (res) {
				res.on('data', function (chunk) {
					var data = iconv.decode(chunk, 'utf-8');
					try {
						data = JSON.parse(data);
					} finally {
						log(data);
						resolve(data)
					}
				});
			});
			req.write(data);
			req.on('error', function (err) {
				reject(err);
			});
			req.end();
		});
	}

	var modifyingRecurrence = function (data) {
		return new Promise((resolve, reject) => {
			options.path = util.format('/1/RecurrentPayment/%s/%s', data.recurrentPaymentId, data.type);
			options.method = 'PUT';
			data = JSON.stringify(data);
			options.headers['Content-Length'] = Buffer.byteLength(data);
			log(options, data);

			var req = https.request(options, function (res) {
				res.on('data', function (chunk) {
					var data = iconv.decode(chunk, 'utf-8');
					try {
						data = JSON.parse(data);
					} finally {
						log(data);
						resolve(data)
					}
				});
			});
			req.write(data.params.toString());
			req.on('error', function (err) {
				reject(err);
			});
			req.end();
		});
	}

	var createTokenizedCard = function (data) {
		return new Promise((resolve, reject) => {
			data = JSON.stringify(data);
			options.headers['Content-Length'] = Buffer.byteLength(data);
			options.path = '/1/card';
			options.method = 'POST';
			
			log(options, data);
			
			var req = https.request(options, function (res) {
				res.on('data', function (chunk) {
					var data = iconv.decode(chunk, 'utf-8');
					try {
						data = JSON.parse(data);
					} finally {
						log(data);
						resolve(data)
					}
				});
			});
			req.write(data);
			req.on('error', function (err) {
				reject(err);
			});
			req.end();
		})
	}

	return {
		creditCard: {
			simpleTransaction: postSalesCielo,
			completeTransaction: postSalesCielo,
			authenticationTransaction: postSalesCielo,
			fraudAnalysisTransaction: postSalesCielo,
			cardTokenTransaction: postSalesCielo,
			captureSaleTransaction: captureSale,
			cancelSale: cancelSale
		},
		debitCard: {
			simpleTransaction: postSalesCielo
		},
		bankSlip: {
			simpleTransaction: postSalesCielo
		},
		boleto: {
			sale: postSalesCielo
		},
		recurrentPayments: {
			firstScheduledRecurrence: postSalesCielo,
			creditScheduledRecurrence: postSalesCielo,
			authorizing: postSalesCielo,
			modifyBuyerData: modifyingRecurrence
		},
		cards: {
			createTokenizedCard: createTokenizedCard,
		}
	}
}