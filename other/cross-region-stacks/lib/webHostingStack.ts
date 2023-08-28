import * as path from "path";
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import { aws_s3_deployment as s3Deploy } from 'aws-cdk-lib';
import * as cloudfront_origins from 'aws-cdk-lib/aws-cloudfront-origins';

interface CrossRegionProps extends cdk.StackProps {
    certificate: acm.Certificate;
    domainName: string;
    hostedZone: string;
}

export class WebHostingStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: CrossRegionProps) {
        super(scope, id, props);

        const bucket = new s3.Bucket(this, 'Bucket', {
            autoDeleteObjects: true,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            bucketName: cdk.PhysicalName.GENERATE_IF_NEEDED,
            publicReadAccess: false,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        const zone = route53.HostedZone.fromLookup(
            this,
            'Route53HostedZone',
            {
                domainName: props.hostedZone,
            },
        );

        const originAccessIdentity = new cloudfront.OriginAccessIdentity(
            this,
            'CloudFrontOriginAccessIdentity',
            {
                comment: `CloudFront OAI for ${props.domainName}`,
            });

        bucket.addToResourcePolicy(new iam.PolicyStatement({
            actions: ['s3:GetObject'],
            resources: [
                bucket.bucketArn,
                `${bucket.bucketArn}/*`,
            ],
            principals: [
                new iam.CanonicalUserPrincipal(originAccessIdentity.cloudFrontOriginAccessIdentityS3CanonicalUserId),
            ],
        }));

        const cloudFrontDistribution = new cloudfront.Distribution(
            this,
            'CloudFrontDistribution', {
                certificate: props.certificate,
                comment: `Static website hosting for ${props.domainName}`,
                defaultRootObject: 'index.html',
                domainNames: [props.domainName],
                defaultBehavior: {
                    allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
                    compress: true,
                    origin: new cloudfront_origins.S3Origin(bucket, {
                        originAccessIdentity: originAccessIdentity,
                    }),
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                },
            });

        new s3Deploy.BucketDeployment(this, 'WebSiteContent', {
            sources: [s3Deploy.Source.asset(path.join(__dirname, './src'))],
            destinationBucket: bucket,
        })

        new route53.ARecord(this, 'Route53DnsRecord', {
            recordName: props.domainName,
            target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(cloudFrontDistribution)),
            zone: zone,
        });
    }
}
