import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { RedirectProtocol } from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as cloudfront_origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';

export class Urlredirection extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

      // Route53 Hosted zone to create domainName under
      const hostedZone = 'ROUTE53-HOSTED-ZONE'; // change me

      // Custom domain name for CloudFront
      const domainName = 'SUBDOMAIN.ROUTE53-HOSTED-ZONE'; // change me

      // the domain name that you wish to redirect to
      const domainNameToRedirectTo = 'DESTINATION-DOMAIN-NAME'; // change me

      const bucket = new s3.Bucket(this, 'Bucket', {
          autoDeleteObjects: true,
          blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
          bucketName: cdk.PhysicalName.GENERATE_IF_NEEDED,
          publicReadAccess: false,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
          websiteIndexDocument: 'index.html', // required even though it is not used
          websiteRoutingRules: [
              // any additional website redirections
              {
                  hostName: domainNameToRedirectTo,
                  protocol: RedirectProtocol.HTTPS,
              },
          ],
      });

      const zone = route53.HostedZone.fromLookup(
          this,
          'Route53HostedZone',
          {
              domainName: hostedZone,
          },
      );

      const certificate = new acm.Certificate(this, 'Certificate', {
          domainName: domainName,
          validation: CertificateValidation.fromDns(zone),
      });

      const originAccessIdentity = new cloudfront.OriginAccessIdentity(
          this,
          'CloudFrontOriginAccessIdentity',
          {
              comment: `CloudFront OAI for ${domainName}`,
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
              certificate: certificate,
              comment: `URL redirection for ${domainName}`,
              defaultRootObject: 'index.html',
              domainNames: [domainName],
              defaultBehavior: {
                  allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
                  compress: true,
                  origin: new cloudfront_origins.S3Origin(bucket, {
                      originAccessIdentity: originAccessIdentity,
                  }),
                  viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
              },
          });

      new route53.ARecord(this, 'Route53DnsRecord', {
          recordName: domainName,
          target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(cloudFrontDistribution)),
          zone: zone,
      });
  }
}
