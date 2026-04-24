import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	JsonObject,
	NodeApiError,
} from 'n8n-workflow';
import type { IDataObject } from 'n8n-workflow';

// ============================================================
// Shared Helpers
// ============================================================

async function endorsalApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
	endpoint: string,
	body?: Record<string, any>,
	qs?: Record<string, string>,
): Promise<any> {
	const credentials = await this.getCredentials('endorsalApi');
	const apiKey = credentials.apiKey as string;

	const options: any = {
		method,
		uri: `https://api.endorsal.io/v1${endpoint}`,
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
		},
		qs: qs ?? {},
		json: true,
	};

	if (body && (method === 'POST' || method === 'PATCH' || method === 'DELETE')) {
		options.body = body;
	}

	return await this.helpers.request(options);
}

function appendWorkflowFooter(
	this: IExecuteFunctions,
	target: Record<string, any>,
	contentKey: string = 'comments',
): void {
	const { id } = this.getWorkflow();
	const footer = `\n\n---\nGenerated via n8n: ${this.getInstanceBaseUrl()}workflow/${id}`;
	const existing = target[contentKey];
	target[contentKey] = existing ? `${existing}${footer}` : footer.trimStart();
}

// ============================================================
// Node Definition
// ============================================================

export class Endorsal implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Endorsal',
		name: 'endorsal',
		icon: 'file:endorsal.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Manage testimonials and tags in Endorsal',
		defaults: { name: 'Endorsal' },
		inputs: ['main'],
		outputs: ['main'],
		credentials: [{ name: 'endorsalApi', required: true }],
		properties: [
			// ==========================
			// Resource
			// ==========================
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Testimonial', value: 'testimonial' },
					{ name: 'Tag', value: 'tag' },
				],
				default: 'testimonial',
			},

			// ==========================
			// Testimonial Operations
			// ==========================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['testimonial'] } },
				options: [
					{ name: 'Create', value: 'create', action: 'Create a testimonial', description: 'Submit a new testimonial' },
					{ name: 'Delete', value: 'delete', action: 'Delete a testimonial' },
					{ name: 'Get', value: 'get', action: 'Get a testimonial' },
					{ name: 'Get Many', value: 'getAll', action: 'Get many testimonials' },
					{ name: 'Search', value: 'search', action: 'Search testimonials', description: 'Multi-field query with operators' },
					{ name: 'Tag', value: 'tag', action: 'Tag a testimonial', description: 'Attach existing and/or new tags' },
					{ name: 'Update', value: 'update', action: 'Update a testimonial' },
				],
				default: 'create',
			},

			// ==========================
			// Tag Operations
			// ==========================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['tag'] } },
				options: [
					{ name: 'Create', value: 'create', action: 'Create a tag' },
					{ name: 'Delete', value: 'delete', action: 'Delete a tag' },
					{ name: 'Get', value: 'get', action: 'Get a tag' },
					{ name: 'Get Many', value: 'getAll', action: 'Get many tags' },
					{ name: 'Get Testimonials', value: 'getTestimonials', action: 'Get testimonials for a tag', description: 'List all testimonials with this tag' },
					{ name: 'Update', value: 'update', action: 'Update a tag' },
				],
				default: 'create',
			},

			// ==================================================
			// Testimonial: Create
			// ==================================================
			{
				displayName:
					'<b>Required fields</b> (marked with a red asterisk): Property, Name, Comments. Everything else is optional.',
				name: 'createNotice',
				type: 'notice',
				default: '',
				displayOptions: { show: { resource: ['testimonial'], operation: ['create'] } },
			},
			{
				displayName: 'Property Name or ID',
				name: 'propertyID',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getProperties' },
				required: true,
				default: '',
				description:
					'Property this testimonial belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				displayOptions: { show: { resource: ['testimonial'], operation: ['create'] } },
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				required: true,
				default: '',
				description: 'Full name of the person leaving the testimonial',
				displayOptions: { show: { resource: ['testimonial'], operation: ['create'] } },
			},
			{
				displayName: 'Comments',
				name: 'comments',
				type: 'string',
				typeOptions: { rows: 4 },
				required: true,
				default: '',
				description:
					'The testimonial text. <b>Plain text only</b> — Endorsal does not render HTML or markdown (any tags will appear as literal text or be stripped). For multi-line / multi-paragraph testimonials, use line breaks (\\n in expressions, or just press Enter in the form). Endorsal stores newlines verbatim, but how they render in your widgets is style-dependent — recommend testing one multi-paragraph testimonial through your actual widget before relying on it.',
				displayOptions: { show: { resource: ['testimonial'], operation: ['create'] } },
			},
			{
				displayName: 'Rating',
				name: 'rating',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 5 },
				default: 5,
				description: 'Star rating (1–5)',
				displayOptions: { show: { resource: ['testimonial'], operation: ['create'] } },
			},
			{
				displayName: 'Approval Status',
				name: 'approved',
				type: 'options',
				options: [
					{ name: 'Pending', value: 0 },
					{ name: 'Approved', value: 1 },
					{ name: 'Rejected', value: 2 },
				],
				default: 0,
				displayOptions: { show: { resource: ['testimonial'], operation: ['create'] } },
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				displayOptions: { show: { resource: ['testimonial'], operation: ['create'] } },
			},
			{
				displayName: 'Avatar URL',
				name: 'avatar',
				type: 'string',
				default: '',
				placeholder: 'https://example.com/avatar.jpg',
				description: 'URL to a publicly accessible image',
				displayOptions: { show: { resource: ['testimonial'], operation: ['create'] } },
			},
			{
				displayName: 'Featured',
				name: 'featured',
				type: 'boolean',
				default: false,
				description: 'Whether this testimonial should be featured',
				displayOptions: { show: { resource: ['testimonial'], operation: ['create'] } },
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['testimonial'], operation: ['create'] } },
				options: [
					{
						displayName: 'Company',
						name: 'company',
						type: 'string',
						default: '',
						description: "The customer's company name (e.g., 'Acme Inc')",
					},
					{
						displayName: 'Date Added',
						name: 'added',
						type: 'dateTime',
						default: '',
						description:
							'Used to backdate a testimonial. Leave empty to let Endorsal record the current submission timestamp with millisecond precision.',
					},
					{
						displayName: 'Include Link to Workflow',
						name: 'includeLinkToWorkflow',
						type: 'boolean',
						default: false,
						description:
							'Whether to append a "Generated via n8n: <workflow URL>" footer to the comments field, linking back to this workflow',
					},
					{
						displayName: 'Location',
						name: 'location',
						type: 'string',
						default: '',
						description: "The customer's geographic location (e.g., 'United States', 'Toronto, ON')",
					},
					{
						displayName: 'Position',
						name: 'position',
						type: 'string',
						default: '',
						placeholder: 'Founder',
						description:
							"The customer's job title or role at their company (e.g., 'Founder', 'CEO', 'Marketing Manager'). Displayed under their name on testimonials.",
					},
				],
			},

			// ==================================================
			// Testimonial: Get / Delete / Update (shared ID field)
			// ==================================================
			{
				displayName: 'Testimonial ID',
				name: 'testimonialId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['testimonial'],
						operation: ['get', 'delete', 'update', 'tag'],
					},
				},
			},

			// ==================================================
			// Testimonial: Update
			// ==================================================
			{
				displayName: 'Update Fields',
				name: 'updateFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['testimonial'], operation: ['update'] } },
				options: [
					{
						displayName: 'Approval Status',
						name: 'approved',
						type: 'options',
						options: [
							{ name: 'Pending', value: 0 },
							{ name: 'Approved', value: 1 },
							{ name: 'Rejected', value: 2 },
						],
						default: 0,
					},
					{
						displayName: 'Avatar URL',
						name: 'avatar',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Comments',
						name: 'comments',
						type: 'string',
						typeOptions: { rows: 4 },
						default: '',
					},
					{
						displayName: 'Company',
						name: 'company',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Email',
						name: 'email',
						type: 'string',
						placeholder: 'name@email.com',
						default: '',
					},
					{
						displayName: 'Featured',
						name: 'featured',
						type: 'boolean',
						default: false,
					},
					{
						displayName: 'Include Link to Workflow',
						name: 'includeLinkToWorkflow',
						type: 'boolean',
						default: false,
						description:
							'Whether to append a "Generated via n8n: <workflow URL>" footer to the comments field. Requires Comments to be set.',
					},
					{
						displayName: 'Location',
						name: 'location',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Position',
						name: 'position',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Rating',
						name: 'rating',
						type: 'number',
						typeOptions: { minValue: 1, maxValue: 5 },
						default: 5,
					},
				],
			},

			// ==================================================
			// Testimonial: Tag
			// ==================================================
			{
				displayName: 'Existing Tag Names or IDs',
				name: 'existingTags',
				type: 'multiOptions',
				typeOptions: { loadOptionsMethod: 'getTags' },
				default: [],
				description:
					'Tags already in your account to attach to this testimonial. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				displayOptions: { show: { resource: ['testimonial'], operation: ['tag'] } },
			},
			{
				displayName: 'New Tags',
				name: 'newTags',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				placeholder: 'Add New Tag',
				default: {},
				description: 'New tags to create and attach in one call',
				displayOptions: { show: { resource: ['testimonial'], operation: ['tag'] } },
				options: [
					{
						name: 'tag',
						displayName: 'Tag',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								required: true,
								default: '',
							},
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								options: [
									{ name: 'Tag', value: 'tag' },
									{ name: 'Product', value: 'product' },
								],
								default: 'tag',
							},
							{
								displayName: 'Description',
								name: 'description',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Image URL',
								name: 'image',
								type: 'string',
								default: '',
								displayOptions: { show: { type: ['product'] } },
							},
							{
								displayName: 'Link',
								name: 'link',
								type: 'string',
								default: '',
								displayOptions: { show: { type: ['product'] } },
							},
							{
								displayName: 'SKU',
								name: 'sku',
								type: 'string',
								default: '',
								description: 'External product ID',
								displayOptions: { show: { type: ['product'] } },
							},
						],
					},
				],
			},

			// ==================================================
			// Testimonial: Search
			// ==================================================
			{
				displayName: 'Query',
				name: 'searchQuery',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				placeholder: 'Add Match',
				default: {},
				description: 'Match conditions. Multiple matches are combined with AND.',
				displayOptions: { show: { resource: ['testimonial'], operation: ['search'] } },
				options: [
					{
						name: 'match',
						displayName: 'Match',
						values: [
							{
								displayName: 'Field',
								name: 'field',
								type: 'string',
								required: true,
								default: '',
								description: 'Field name on the testimonial to match against (e.g., "name", "rating", "approved")',
							},
							{
								displayName: 'Operator',
								name: 'operator',
								type: 'options',
								options: [
									{ name: 'Equals', value: '=' },
									{ name: 'Not Equal', value: '!=' },
									{ name: 'Greater Than', value: '>' },
									{ name: 'Greater Than or Equal', value: '>=' },
									{ name: 'Less Than', value: '<' },
									{ name: 'Less Than or Equal', value: '<=' },
									{ name: 'Contains (Regex)', value: 'contains' },
									{ name: 'In (Array)', value: 'in' },
								],
								default: '=',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description:
									'Value to match. For the "In" operator, provide a JSON array (e.g., ["abc123","def456"]). For numbers, enter digits only.',
							},
						],
					},
				],
			},

			// ==================================================
			// Tag: Create
			// ==================================================
			{
				displayName: 'Name',
				name: 'tagName',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['tag'], operation: ['create'] } },
			},
			{
				displayName: 'Type',
				name: 'tagType',
				type: 'options',
				options: [
					{ name: 'Tag', value: 'tag' },
					{ name: 'Product', value: 'product' },
				],
				default: 'tag',
				displayOptions: { show: { resource: ['tag'], operation: ['create'] } },
			},
			{
				displayName: 'Additional Fields',
				name: 'tagAdditionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['tag'], operation: ['create'] } },
				options: [
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Image URL',
						name: 'image',
						type: 'string',
						default: '',
						displayOptions: { show: { '/tagType': ['product'] } },
					},
					{
						displayName: 'Link',
						name: 'link',
						type: 'string',
						default: '',
						displayOptions: { show: { '/tagType': ['product'] } },
					},
					{
						displayName: 'SKU',
						name: 'sku',
						type: 'string',
						default: '',
						description: 'External product ID',
						displayOptions: { show: { '/tagType': ['product'] } },
					},
				],
			},

			// ==================================================
			// Tag: Get / Delete / Update / GetTestimonials (shared ID field)
			// ==================================================
			{
				displayName: 'Tag Name or ID',
				name: 'tagId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getTags' },
				required: true,
				default: '',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				displayOptions: {
					show: {
						resource: ['tag'],
						operation: ['get', 'delete', 'update', 'getTestimonials'],
					},
				},
			},

			// ==================================================
			// Tag: Update
			// ==================================================
			{
				displayName: 'Update Fields',
				name: 'tagUpdateFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['tag'], operation: ['update'] } },
				options: [
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Image URL',
						name: 'image',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Link',
						name: 'link',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
					},
					{
						displayName: 'SKU',
						name: 'sku',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Type',
						name: 'type',
						type: 'options',
						options: [
							{ name: 'Tag', value: 'tag' },
							{ name: 'Product', value: 'product' },
						],
						default: 'tag',
					},
				],
			},
		],
	};

	// ============================================================
	// loadOptions
	// ============================================================

	methods = {
		loadOptions: {
			async getProperties(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				try {
					const response = await endorsalApiRequest.call(this, 'GET', '/properties');
					const items = (response?.data ?? []) as any[];
					return items
						.map((p: any) => ({
							name: p.name || p.domain || p._id,
							value: p._id,
						}))
						.sort((a, b) => String(a.name).localeCompare(String(b.name)));
				} catch {
					return [];
				}
			},

			async getTags(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				try {
					const response = await endorsalApiRequest.call(this, 'GET', '/tags');
					const items = (response?.data ?? []) as any[];
					return items
						.map((t: any) => ({
							name: t.type === 'product' ? `[Product] ${t.name}` : t.name,
							value: t._id,
						}))
						.sort((a, b) => String(a.name).localeCompare(String(b.name)));
				} catch {
					return [];
				}
			},
		},
	};

	// ============================================================
	// execute
	// ============================================================

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let responseData: any;

				// ======================
				// Testimonial
				// ======================
				if (resource === 'testimonial') {
					if (operation === 'create') {
						const body: Record<string, any> = {
							propertyID: this.getNodeParameter('propertyID', i) as string,
							name: this.getNodeParameter('name', i) as string,
							comments: this.getNodeParameter('comments', i) as string,
							rating: this.getNodeParameter('rating', i) as number,
							approved: this.getNodeParameter('approved', i) as number,
							featured: (this.getNodeParameter('featured', i) as boolean) ? 1 : 0,
						};

						const email = this.getNodeParameter('email', i, '') as string;
						if (email) body.email = email;
						const avatar = this.getNodeParameter('avatar', i, '') as string;
						if (avatar) body.avatar = avatar;

						const additional = this.getNodeParameter('additionalFields', i) as IDataObject;
						if (additional.location) body.location = additional.location;
						if (additional.position) body.position = additional.position;
						if (additional.company) body.company = additional.company;
						if (additional.added) {
							body.added = new Date(additional.added as string).toISOString().split('T')[0];
						}

						if (additional.includeLinkToWorkflow) {
							appendWorkflowFooter.call(this, body, 'comments');
						}

						responseData = await endorsalApiRequest.call(this, 'POST', '/testimonials', body);
						responseData = responseData?.data ?? responseData;
					}

					else if (operation === 'get') {
						const id = this.getNodeParameter('testimonialId', i) as string;
						responseData = await endorsalApiRequest.call(this, 'GET', `/testimonials/${id}`);
						responseData = responseData?.data ?? responseData;
					}

					else if (operation === 'getAll') {
						responseData = await endorsalApiRequest.call(this, 'GET', '/testimonials');
						for (const item of (responseData?.data ?? [])) {
							returnData.push({ json: item, pairedItem: { item: i } });
						}
						continue;
					}

					else if (operation === 'update') {
						const id = this.getNodeParameter('testimonialId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
						const body: Record<string, any> = {};

						for (const [key, value] of Object.entries(updateFields)) {
							if (key === 'includeLinkToWorkflow') continue;
							if (value === undefined || value === null || value === '') continue;
							if (key === 'featured') body.featured = value ? 1 : 0;
							else body[key] = value;
						}

						if (updateFields.includeLinkToWorkflow && body.comments) {
							appendWorkflowFooter.call(this, body, 'comments');
						}

						responseData = await endorsalApiRequest.call(this, 'PATCH', `/testimonials/${id}`, body);
						responseData = responseData?.data ?? responseData;
					}

					else if (operation === 'delete') {
						const id = this.getNodeParameter('testimonialId', i) as string;
						responseData = await endorsalApiRequest.call(this, 'DELETE', `/testimonials/${id}`);
						responseData = responseData?.data ?? responseData;
					}

					else if (operation === 'tag') {
						const id = this.getNodeParameter('testimonialId', i) as string;
						const existingTags = this.getNodeParameter('existingTags', i, []) as string[];
						const newTagsCollection = this.getNodeParameter('newTags', i, {}) as {
							tag?: Array<{
								name: string;
								type: string;
								description?: string;
								image?: string;
								link?: string;
								sku?: string;
							}>;
						};

						const tags: Array<Record<string, any>> = [];
						for (const tagId of existingTags) {
							tags.push({ _id: tagId });
						}
						for (const newTag of newTagsCollection.tag ?? []) {
							const entry: Record<string, any> = {
								name: newTag.name,
								type: newTag.type,
							};
							if (newTag.description) entry.description = newTag.description;
							if (newTag.image) entry.image = newTag.image;
							if (newTag.link) entry.link = newTag.link;
							if (newTag.sku) entry.sku = newTag.sku;
							tags.push(entry);
						}

						responseData = await endorsalApiRequest.call(
							this, 'POST', `/testimonials/${id}/tag`, { tags },
						);
						responseData = responseData?.data ?? responseData;
					}

					else if (operation === 'search') {
						const searchQuery = this.getNodeParameter('searchQuery', i, {}) as {
							match?: Array<{ field: string; operator: string; value: string }>;
						};

						const query = (searchQuery.match ?? []).map((m) => {
							let parsedValue: any = m.value;
							if (m.operator === 'in') {
								try {
									parsedValue = JSON.parse(m.value);
								} catch {
									parsedValue = m.value;
								}
							} else if (/^-?\d+(\.\d+)?$/.test(m.value)) {
								parsedValue = Number(m.value);
							}
							return {
								field: m.field,
								operator: m.operator,
								value: parsedValue,
							};
						});

						responseData = await endorsalApiRequest.call(
							this, 'POST', '/testimonials/search', { query },
						);
						for (const item of (responseData?.data ?? [])) {
							returnData.push({ json: item, pairedItem: { item: i } });
						}
						continue;
					}
				}

				// ======================
				// Tag
				// ======================
				else if (resource === 'tag') {
					if (operation === 'create') {
						const body: Record<string, any> = {
							name: this.getNodeParameter('tagName', i) as string,
							type: this.getNodeParameter('tagType', i) as string,
						};
						const additional = this.getNodeParameter('tagAdditionalFields', i) as IDataObject;
						if (additional.description) body.description = additional.description;
						if (additional.image) body.image = additional.image;
						if (additional.link) body.link = additional.link;
						if (additional.sku) body.sku = additional.sku;

						responseData = await endorsalApiRequest.call(this, 'POST', '/tags', body);
						responseData = responseData?.data ?? responseData;
					}

					else if (operation === 'get') {
						const id = this.getNodeParameter('tagId', i) as string;
						responseData = await endorsalApiRequest.call(this, 'GET', `/tags/${id}`);
						responseData = responseData?.data ?? responseData;
					}

					else if (operation === 'getAll') {
						responseData = await endorsalApiRequest.call(this, 'GET', '/tags');
						for (const item of (responseData?.data ?? [])) {
							returnData.push({ json: item, pairedItem: { item: i } });
						}
						continue;
					}

					else if (operation === 'update') {
						const id = this.getNodeParameter('tagId', i) as string;
						const updateFields = this.getNodeParameter('tagUpdateFields', i) as IDataObject;
						const body: Record<string, any> = {};
						for (const [key, value] of Object.entries(updateFields)) {
							if (value === undefined || value === null || value === '') continue;
							body[key] = value;
						}
						responseData = await endorsalApiRequest.call(this, 'PATCH', `/tags/${id}`, body);
						responseData = responseData?.data ?? responseData;
					}

					else if (operation === 'delete') {
						const id = this.getNodeParameter('tagId', i) as string;
						responseData = await endorsalApiRequest.call(this, 'DELETE', `/tags/${id}`);
						responseData = responseData?.data ?? responseData;
					}

					else if (operation === 'getTestimonials') {
						const id = this.getNodeParameter('tagId', i) as string;
						responseData = await endorsalApiRequest.call(
							this, 'GET', `/tags/${id}/testimonials`,
						);
						for (const item of (responseData?.data ?? [])) {
							returnData.push({ json: item, pairedItem: { item: i } });
						}
						continue;
					}
				}

				returnData.push({ json: responseData, pairedItem: { item: i } });
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
