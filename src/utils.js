
export function promisifyCb(params, func) {
	return new Promise((resolve, reject) =>
		func(params, (err, data) => (err) ? reject(err): resolve(data)));
}
