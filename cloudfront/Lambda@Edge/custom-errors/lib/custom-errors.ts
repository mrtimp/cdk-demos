import * as path from "path";
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam'
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as cloudfront_origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { CachePolicy, LambdaEdgeEventType } from 'aws-cdk-lib/aws-cloudfront';

export class CustomErrors extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const bucket = new s3.Bucket(this, 'Bucket', {
            autoDeleteObjects: true,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            bucketName: cdk.PhysicalName.GENERATE_IF_NEEDED,
            publicReadAccess: false,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        const originAccessIdentity = new cloudfront.OriginAccessIdentity(
            this,
            'CloudFrontOriginAccessIdentity'
        );

        const lambdaEdgeFunction = new NodejsFunction(this, 'LambdaAtEdge', {
            bundling: {
                sourcesContent: true,
            },
            entry: path.join(__dirname, '/lambda/src/index.ts'),
            handler: 'handler',
            runtime: Runtime.NODEJS_18_X,
            timeout: cdk.Duration.seconds(5),
        });

        lambdaEdgeFunction.role?.attachInlinePolicy(
            new iam.Policy(this, 'LambdaAtEdgePermissions', {
                statements: [
                    new iam.PolicyStatement({
                        actions: [
                            'logs:CreateLogGroup',
                            'logs:CreateLogStream',
                            'logs:PutLogEvents',
                        ],
                        resources: ['arn:aws:logs:*:*:*'],
                    }),
                ],
            }),
        );

        const cloudFrontDistribution = new cloudfront.Distribution(
            this,
            'CloudFrontDistribution', {
                defaultRootObject: 'index.html',
                defaultBehavior: {
                    allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
                    cachePolicy: CachePolicy.CACHING_DISABLED,
                    compress: true,
                    edgeLambdas: [
                        {
                            functionVersion: lambdaEdgeFunction.currentVersion,
                            eventType: LambdaEdgeEventType.ORIGIN_RESPONSE,
                        },
                    ],
                    origin: new cloudfront_origins.S3Origin(bucket, {
                        originAccessIdentity: originAccessIdentity,
                    }),
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                },
            }
        );
    }
}
