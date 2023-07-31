# AWS Serverless - URL Redirection

This demo stack allows you to create a totally serverless and scalable URL redirection service. Using CloudFront, ACM, 
S3 there are no moving parts for you to maintain.

Notes:

* ACM requires that you must generate certificates out of `us-east-1` so the entire stack is deployed there (for simplicity)
* To allow the `route53.HostedZone.fromLookup` to lookup the Route53 `hostedZoneId` the account and region are passed  
  through in `urlredirect/bin/urlredirection.ts`

## Deploy the stack

```bash
cdk deploy
```
