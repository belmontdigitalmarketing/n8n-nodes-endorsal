import {
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';

export class EndorsalTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Endorsal Trigger',
		name: 'endorsalTrigger',
		icon: 'file:endorsal.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when Endorsal sends a webhook event',
		defaults: { name: 'Endorsal Trigger' },
		inputs: [],
		outputs: ['main'],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName:
					'Configure this webhook URL in your Endorsal dashboard: <strong>Settings → Webhooks → Add webhook</strong>. Paste the Production URL shown above. Endorsal will POST event payloads to this URL whenever the events you subscribe to fire — this trigger emits each payload as a single item to the workflow.',
				name: 'instructions',
				type: 'notice',
				default: '',
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const body = this.getBodyData();
		const headers = this.getHeaderData();

		return {
			workflowData: [
				this.helpers.returnJsonArray([
					{
						body,
						headers,
					},
				]),
			],
		};
	}
}
