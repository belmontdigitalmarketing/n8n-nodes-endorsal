# n8n-nodes-endorsal

n8n community node for [Endorsal](https://endorsal.io/) — testimonial and review collection automation.

This package provides two nodes:

- **Endorsal** — action node for managing testimonials and tags
- **Endorsal Trigger** — webhook trigger that fires when Endorsal sends events

## Installation

In your n8n editor: **Settings → Community Nodes → Install** → enter `@belmontdigitalmarketing/n8n-nodes-endorsal`.

## Credentials

You need an Endorsal API key. Generate one at https://app.endorsal.io/account/api by selecting the property you want to access. The key works across all properties on your account.

## Endorsal node operations

### Testimonial
- **Create** — submit a new testimonial
- **Get** — retrieve a single testimonial by ID
- **Get Many** — list all testimonials
- **Update** — modify an existing testimonial
- **Delete** — remove a testimonial
- **Tag** — attach existing tags or create new tags on a testimonial in one call
- **Search** — multi-field query with operators (`=`, `>`, `>=`, `<`, `<=`, `!=`, `contains`, `in`)

### Tag
- **Create** — create a new tag (type "tag" or "product")
- **Get** — retrieve a single tag by ID
- **Get Many** — list all tags
- **Update** — modify an existing tag
- **Delete** — remove a tag
- **Get Testimonials** — list all testimonials with a specific tag

Every Create and Update operation includes an optional **Include Link to Workflow** toggle that appends a workflow attribution footer to the testimonial body, matching Belmont's standard convention across our other n8n nodes.

## Endorsal Trigger node

Receives webhooks from Endorsal. To use:

1. Add the Endorsal Trigger node to your workflow
2. Copy the webhook URL n8n shows you
3. Paste it into your Endorsal dashboard (Settings → Webhooks)
4. Activate the workflow

The trigger emits the entire webhook payload as the workflow input.

## License

MIT
