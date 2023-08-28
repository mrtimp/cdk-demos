import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';

interface CertificateProps extends cdk.StackProps {
    domainName: string;
    hostedZone: string;
}

export class CertificateStack extends cdk.Stack {
    public readonly certificate: acm.Certificate;

    constructor(scope: Construct, id: string, props: CertificateProps) {
        super(scope, id, props);

        const zone = route53.HostedZone.fromLookup(
            this,
            'Route53HostedZone',
            {
                domainName: props.hostedZone,
            },
        );

        this.certificate = new acm.Certificate(this, 'Certificate', {
            domainName: props.domainName,
            validation: CertificateValidation.fromDns(zone),
        });
    }
}
