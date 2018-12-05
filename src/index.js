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

async function applyChange({ localPath }) {
	const [{ service, dependencies }] = serviceMappings.filter(({ prefix }) => localPath.indexOf(prefix) === 0);
	console.log('updating service', service);
	try {
		await systemctl.restart(service);
		if(dependencies) {
			await Promise.all(dependencies.map(service => systemctl.restart(service)));
		}
		console.log('updated service', service);
		return { updated: true };
	} catch (error) {
		console.error('service update failed', service, error);
		return { updated: false, error };
	}
}

function rollBack({ localPath, oldConfig }) {
	fs.writeFileSync(localPath, oldConfig);
	console.log('Wrote old config to', localPath);
	return applyChange({ localPath });	
}

// Perform a single update
async function updateServer() {
	const message = await changeTracker.getMessage();
	if(!message) {
		return { updated: false };
	}
	const { key, receiptHandle } = message;
	const { localPath, oldConfig } = await loadDesiredConfig({ key });
	const { updated, error } = await applyChange({ localPath });
	await changeTracker.deleteMessage({ receiptHandle });
	if(error) {
		await rollBack({ localPath, oldConfig });
	}
	return { updated: true };
}

// Continuously check for updates
async function updateLoop() {
	const { updated } = await updateServer()
		.catch(err => {
			console.log('server update failed', err)
			return { updated: false };
		});
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
