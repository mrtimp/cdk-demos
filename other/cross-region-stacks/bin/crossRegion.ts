#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import 'source-map-support/register';
import { WebHostingStack } from '../lib/webHostingStack';
import { CertificateStack } from '../lib/certificateStack';

const app = new cdk.App();

// Route53 Hosted zone to create domainName under
const hostedZone = 'ROUTE53-HOSTED-ZONE'; // change me

// Custom domain name for CloudFront
const domainName = 'ROUTE53-HOSTED-ZONE'; // change me

const certificateStack = new CertificateStack(app, 'CertificateStack', {
    crossRegionReferences: true,
    domainName: domainName,
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: 'us-east-1'
    },
    hostedZone: hostedZone,
});

new WebHostingStack(app, 'WebHostingStack', {
    certificate: certificateStack.certificate,
    crossRegionReferences: true,
    domainName: domainName,
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
    },
    hostedZone: hostedZone,
});
