import AWS from 'aws-sdk';
import { promisifyCb } from './utils';

const {
	AWS_DEFAULT_REGION: region,
	AWS_SQS_URL: QueueUrl,
} = process.env;

const sqs = new AWS.SQS({ region });

const WaitTimeSeconds = 15;

export default class ChangeTracker {
	async getMessage() {
		const params = {
			QueueUrl,
			WaitTimeSeconds,
			MaxNumberOfMessages: 1,
		};
		const { Messages: messages } = await promisifyCb(params, sqs.receiveMessage.bind(sqs))
		if(messages) {
			const [{ Body: json, ReceiptHandle: receiptHandle, }] = messages;
			const { Records: [{ s3: { object: { key } } } ] } = JSON.parse(json);
			return { key, receiptHandle };
		}
		return messages;		
	}

	deleteMessage({ receiptHandle }) {
		const params = {
			QueueUrl,
			ReceiptHandle: receiptHandle,
		}
		return promisifyCb(params, sqs.deleteMessage.bind(sqs));
	}

	flush() {
		const params = {
			QueueUrl,
		};
		return promisifyCb(params, sqs.purgeQueue.bind(sqs));
	}
}
