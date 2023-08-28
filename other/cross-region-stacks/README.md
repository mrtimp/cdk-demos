# Cross region stacks 

This stack demo will use ACM in `us-east-1` to request a certificate (using [ACM's Cross-region certificates](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_certificatemanager-readme.html#cross-region-certificates)) 
while your other serverless website hosting resources are in another region.

## Deploy the stack

```bash
cdk deploy --all
```
