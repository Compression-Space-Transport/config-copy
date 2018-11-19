import fs from 'fs';
import systemctl from 'systemctl';
import { DesiredConfigPrefix, loadDesiredConfig, uploadRemoteFile } from './s3store';
import ChangeTracker from './change-tracker';

const localPaths = {
	dhcpd: '/etc/dhcp/dhcpd.conf',
	iptables: '/etc/sysconfig/iptables',
};

const localNetconfPaths = [
	'/etc/sysconfig/network-scripts/ifcfg-enp2s0',
	'/etc/sysconfig/network-scripts/ifcfg-enp3s0',
	'/etc/sysconfig/network-scripts/ifcfg-enp3s0.2048',
	'/etc/sysconfig/network-scripts/ifcfg-enp3s0.250',
	'/etc/sysconfig/network-scripts/ifcfg-enp3s0.666',
];

// Sync current configs to desired configs
export function uploadConfigs() {
	const paths = Object.keys(localPaths).map(key => localPaths[key]).concat(localNetconfPaths);
	return Promise.all(paths.map(path => {
		const body = fs.readFileSync(path);
		return uploadRemoteFile({ path: `${DesiredConfigPrefix}/${path}`.replace('//', '/'), body });
	}));
}
