'use strict';

var Q = require('q');
var util = require('./utilService')();

module.exports = function(Subscriber) {

	return {

		subscribe: function(email) {

			console.log("Subscribe email...");

			var deferred = Q.defer();

			try {
				var self = this;

				if(util.isEmailValid(email)){
					self.get(email).then(function(subscriber) {
						if (subscriber) {
							console.log("Already Subscribed");
							deferred.reject('Already Subscribed');
						} else {
							subscriber = new Subscriber();
							subscriber.email = email;

							subscriber.save(function(err) {
								if (err) {
									console.log("Error saving subscriber email...");
									deferred.reject(err);
								} else {
									console.log("Success on saving subscriber email...");
									deferred.resolve(email);
								}
							});
						}
					});
				} else {
					console.log("Emailid invalid..");
					deferred.reject("Emailid invalid..");
				}

			} catch (err) {
				global.winston.log('error', {
					"error": String(err),
					"stack": new Error().stack
				});
				deferred.reject(err);
			}

			return deferred.promise;
		},


		get: function(email) {

			console.log("Get subscriber by email...");
			var deferred = Q.defer();

			try {

				Subscriber.findOne({
					email: email
				}, function(err, subscriber) {
					if (err) {
						console.log("Error on Get subscriber by email...");
						deferred.reject(err);
					} else {
						console.log("Success on Get subscriber by email...");
						deferred.resolve(subscriber);
					}
				});

			} catch (err) {
				global.winston.log('error', {
					"error": String(err),
					"stack": new Error().stack
				});
				deferred.reject(err);
			}

			return deferred.promise;

		},

		delete: function(email) {

			console.log("Delete subscriber by email...");

			var deferred = Q.defer();

			try {

				Subscriber.findOneAndRemove({
					email: email
				}, function(err, subscriber) {
					if (err) {
						console.log("Error on Delete subscriber by email...");
						deferred.reject(err);
					} else {
						console.log("Success on Delete subscriber by email...");
						deferred.resolve(subscriber);
					}
				});

			} catch (err) {
				global.winston.log('error', {
					"error": String(err),
					"stack": new Error().stack
				});
				deferred.reject(err);
			}

			return deferred.promise;
		}

	};


};
