module.exports = function(mongoose){

	var Schema = mongoose.Schema;
	
	var notificationSchema = new Schema({	 
	            user : String,	
	             text: String,
	            appId: String,
	 notificationType: String,
	             type: String,
	             seen: Boolean,
	             date: { type: Date, default: Date.now }

	});

	return mongoose.model('Notification', notificationSchema);
};
