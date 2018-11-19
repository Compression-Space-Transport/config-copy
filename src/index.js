import fs from 'fs';
import systemctl from 'systemctl';
import { loadDesiredConfig, uploadRemoteFile } from './s3store';
import { uploadConfigs } from './config-uploader';
import ChangeTracker from './change-tracker';

const changeTracker = new ChangeTracker();

const serviceMappings = [
	{ prefix: '/etc/sysconfig/network-scripts', service: 'network', dependencies: ['dhcpd'], },
	{ prefix: '/etc/sysconfig/iptables', service: 'iptables' },
	{ prefix: '/etc/dhcp', service: 'dhcpd' },
];

// Perform a single update
async function updateServer() {
	const message = await changeTracker.getMessage();
	if(!message) {
		return { updated: false };
	}
	const { key, receiptHandle } = message;
	const { localPath } = await loadDesiredConfig({ key });
	const [{ service, dependencies }] = serviceMappings.filter(({ prefix }) => localPath.indexOf(prefix) === 0);
	console.log('updating service', service);
	await systemctl.restart(service);
	if(dependencies) {
		await Promise.all(dependencies.map(service => systemctl.restart(service)));
	}
	await changeTracker.deleteMessage({ receiptHandle });
	console.log('updated service', service);
	return { updated: true, service };
}

// Continuously check for updates
async function updateLoop() {
	const { updated } = await updateServer();
	if(updated) {
		return updateLoop();
	}
	setTimeout(updateLoop, 10*1000);
}

async function main() {
	await uploadConfigs();
	await changeTracker.flush();

	updateLoop();
}
main();
