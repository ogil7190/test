const {MongoClient} = require('mongodb');
const {Collections} = require('./constants');

const connectionUrl = 'mongodb+srv://tester:test@789@cluster0-6cmbe.mongodb.net/test?retryWrites=true&w=majority'
const dbName = 'test'

let db

const initDB = async () => {
	try {
		const client = await MongoClient.connect(connectionUrl, {useNewUrlParser: true});
		db = client.db(dbName);
		console.log('DB Connected');
	} catch (error) {
		console.log('Error occured connecting DB ' + error);
	}
}

const getLatestTask = async () => {
	const collection = db.collection(Collections.COLLECTION_TASKS)
	return await collection.findOne();
}

const getProtcolByName = async (name) => {
	const collection = db.collection(Collections.COLLECTION_PROTOCOLS)
	return await collection.findOne({
		name
	});
}

const getWorkerByToken = async (token) => {
	const collection = db.collection(Collections.COLLECTION_WORKERS);
	return await collection.findOne({
		token
	});
}

const getWorkByName = async (name) => {
	const collection = db.collection(Collections.COLLECTION_WORKS);
	await updateWorkDone(name);
	return await collection.findOne({
		name
	});
}

const getTaskByName = async (name) => {
	const collection = db.collection(Collections.COLLECTION_TASKS);
	return await collection.findOne({
		name
	});
}

const getLastInsertedToken = async () => {
	const collection = db.collection(Collections.COLLECTION_WORKERS);
	const lastWorker = await collection.find().limit(1).sort({$natural:-1}).toArray();
	return lastWorker[0].token;
}

const insertIntoCollection = async (data, collection) => {
	const _collection = db.collection(collection);
	return await _collection.insertOne({ ...data, createdAt: new Date(Date.now()).toISOString() });
}

function resolveCondition( condition, token, isFree ){
	const forEveryone = condition.forEveryone || false;
	if( forEveryone ) return true;
	
	const match = condition.match;
	for(let i=0; i<match.length; i++){
		const matchObj = match[i];
		const value = matchObj.value;
		const pattern = matchObj.pattern;
		const freeOnly = matchObj.freeOnly;
		if( freeOnly && (!isFree) ){
			return false;
		}
		switch( pattern ){
			case "lt": if( token < value ) break; else return false;

			case "gt": if( token > value ) break; else return false;

			case "lte": if( token <= value ) break; else return false;

			case "gte": if( token >= value ) break; else return false;

			case "e": if( token == value ) break; else return false;

			case "factor": if( token % value === 0 ) break; else return false;

			case "includes": if( value.indexOf( token ) >=0 ) break; else return false;
		}
	}
	return true;
}

const getWorksForMe = async ( token, isFree ) => {
	const collection = db.collection(Collections.COLLECTION_WORKS);
	const activeWorks = await collection.find({ active:true, remaining:{$gt:0} }).toArray();
	const works = [];
	for( let i=0; i<activeWorks.length; i++){
		const _work = activeWorks[i];
		const addToList = resolveCondition( _work.condition, token, isFree );
		addToList && works.push( _work );
	}
	return works;
}

const readOverride = async ( token, isFree ) => {
	const collection = db.collection(Collections.COLLECTION_OVERRIDE);
	const override = await collection.findOne();
	if( override ){
		const condition = override.condition;
		return resolveCondition( condition, token, isFree );
	}
	return false;
}

const requestingScreenShots = async ( token ) => {
	const _token = 'u' + token;
	const worker = await getWorkerByToken( _token );
	const storeSS = worker.storeSS;
	if( storeSS ){
		const count = worker.SSCount;
		await screenshotingDone( token );
		return count;
	}
	return 0;
}

const screenshotingDone = async ( token ) => {
	const _token = 'u' + token;
	const collection = db.collection( Collections.COLLECTION_WORKERS );
	return await collection.updateOne({ token : _token}, { $set : {storeSS : 0}});
}

const markOnline = async ( token ) => {
	const _token = 'u' + token;
	const collection = db.collection(Collections.COLLECTION_WORKERS);
	return await collection.updateOne({ token : _token}, { $set : { last_online : new Date(Date.now()).toISOString() }});
}

const updateWorkDone = async ( workName ) => {
	const collection = db.collection(Collections.COLLECTION_WORKS);
	return await collection.updateOne({ name : workName}, { $inc : { remaining : -1 }});
}

module.exports = {
	initDB,
	getLatestTask,
	getProtcolByName,
	getWorkerByToken,
	getLastInsertedToken,
	insertIntoCollection,
	getWorksForMe,
	markOnline,
	readOverride,
	requestingScreenShots,
	updateWorkDone,
	getWorkByName,
	getTaskByName
}