import AWS from 'aws-sdk';
import fs from 'fs';
import { promisifyCb } from './utils';

const BucketName = 'compression-space-transport';
export const DesiredConfigPrefix = 'desired-configs';
const BackupPrefix = 'config-backups';

const s3 = new AWS.S3();

async function listRemoteFiles({ prefix }) {
	const params = {
		Bucket: BucketName,
		Prefix: prefix,
	};

	const { Contents } = await promisifyCb(params, s3.listObjects.bind(s3));
	return Contents.map(({ Key }) => Key);
}

async function remoteFileExists({ path }) {
	const matchingFiles = await listRemoteFiles({ prefix: path });
	return matchingFiles.includes(path);
}

async function loadRemoteFile({ key }) {
	const params = {
		Bucket: BucketName,
		Key: key,
	};
	const { Body } = await promisifyCb(params, s3.getObject.bind(s3));
	return Body;
}

export async function uploadRemoteFile({ path, body }) {
	const params = {
		Bucket: BucketName,
		Key: path,
		Body: body,
	};
	console.log('Uploading file', path, body);
	return promisifyCb(params, s3.putObject.bind(s3))
		.then(console.log)
		.catch(console.error);
}

async function backupLocalFile({ localPath }) {
	const body = fs.readFileSync(localPath);
	const path = `${BackupPrefix}/${localPath}`.replace('//', '/');
	return uploadRemoteFile({ path, body });
}

export async function loadDesiredConfig({ key }) {
	const data = await loadRemoteFile({ key });
	const localPath = key.replace(DesiredConfigPrefix, '');
	await backupLocalFile({ localPath });
	fs.writeFileSync(localPath, data);
	return { localPath };
}


