# auth.md

This file is for agents that want to fetch public biography and publication pages on https://parthsuresh.com. It is not a product registration guide and it does not describe an API that issues credentials.

## Audience

Agents identifying Parth Suresh, confirming his affiliation at Datology AI, or listing selected publications on synthetic data, long-context data, and evaluating large models.

## Access

Every resource on this host is public and unauthenticated. There are no accounts, no agent identities, and no sessions.

## Registration

There is no registration or provisioning endpoint. Do not POST anywhere on this host. Do not call `/agent/auth`, `/agent/auth/claim`, or any other invented write path.

## Supported methods

None. Anonymous public GET only.

## Credentials

Do not send bearer tokens, API keys, or cookies. This site does not issue credentials and does not accept them. Do not harvest contact details; there is no public inbox or phone number.

## Where to read instead

- [llms.txt](/llms.txt) — when to use this site
- [Home (markdown)](/index.md) — biography
- [Publications (markdown)](/publications.md) — paper list
- [API catalog](/.well-known/api-catalog) — RFC 9727 catalog of the public GET surface
- [OpenAPI](/openapi.json) — the same public GET pages as OpenAPI 3.1
