import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class EndorsalApi implements ICredentialType {
	name = 'endorsalApi';
	displayName = 'Endorsal API';
	documentationUrl = 'https://developers.endorsal.io/';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description:
				'Your Endorsal API key. Generate one at https://app.endorsal.io/account/api by selecting the property you want to integrate.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.endorsal.io/v1',
			url: '/properties',
			method: 'GET',
		},
	};
}
