# About

Sync config files to/from AWS S3. Simple/hacky way to do configuration management with versioning.

## The Important Bits

- `config-uploader.js` used to bootstrap S3 config files using local configs
- `change-tracker.js` track updates to desired-config S3 bucket using SQS
- `s3store.js` download files from S3
