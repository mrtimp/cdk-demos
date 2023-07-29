import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Effect, ManagedPolicy } from 'aws-cdk-lib/aws-iam';
import { aws_iam as iam, custom_resources as cr } from 'aws-cdk-lib';

export class InstanceConnectEndpoint extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const privateSubnet = 'private-egress';

        const vpc = new ec2.Vpc(this, 'VPC', {
            natGateways: 0,
            maxAzs: 1,
            subnetConfiguration: [
                {
                    name: privateSubnet,
                    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
                    cidrMask: 24
                }
            ]
        });

        const securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
            vpc: vpc,
            description: 'Allow SSH from within the VPC',
            allowAllOutbound: true
        });

        securityGroup.addIngressRule(
            ec2.Peer.ipv4(vpc.vpcCidrBlock),
            ec2.Port.tcp(22),
        );

        const endpoint = new cr.AwsCustomResource(this, 'InstanceConnectEndpoint', {
            resourceType: 'Custom::EC2InstanceConnectEndpoint',
            onCreate: {
                service: 'EC2',
                action: 'createInstanceConnectEndpoint',
                parameters: {
                    PreserveClientIp: false,
                    SubnetId: vpc.selectSubnets({subnetGroupName: privateSubnet}).subnets[0].subnetId,
                    SecurityGroupIds: [securityGroup.securityGroupId]
                },
                physicalResourceId: cr.PhysicalResourceId.fromResponse('InstanceConnectEndpoint.InstanceConnectEndpointId')
            },
            onUpdate: {
                // null update to ensure that updates to the
                // custom resource do not fail
                service: 'STS',
                action: 'getCallerIdentity',
            },
            onDelete: {
                service: 'EC2',
                action: 'deleteInstanceConnectEndpoint',
                parameters: {
                    InstanceConnectEndpointId: new cr.PhysicalResourceIdReference(),
                },
            },
            // https://github.com/aws/aws-cdk/issues/13601?ref=blog.purple-technology.com
            policy: cr.AwsCustomResourcePolicy.fromStatements([
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        "ec2:CreateInstanceConnectEndpoint",
                        "ec2:CreateNetworkInterface",
                        "ec2:CreateTags",
                        "ec2:DescribeInstanceConnectEndpoints",
                        "ec2:DeleteInstanceConnectEndpoint",
                        "ec2:DescribeRegions",
                        "ec2:DescribeSecurityGroups",
                        "ec2:DescribeSubnets",
                        "ec2:DescribeVpcs",
                        "iam:CreateServiceLinkedRole",
                    ],
                    resources: ["*"],
                }),
            ]),
            installLatestAwsSdk: true
        });

        endpoint.node.addDependency(vpc)

        const role = new iam.Role(this, 'InstanceProfile', {
            assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
        });

        role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'))
        role.addToPolicy(new iam.PolicyStatement({
            actions: [
                "ec2-instance-connect:OpenTunnel",
            ],
            effect: Effect.ALLOW,
            resources: [endpoint.getResponseField('InstanceConnectEndpoint.InstanceConnectEndpointArn')]
            // optionally add conditions to further restrict SSH
        }));

        const instance = new ec2.Instance(this, 'Instance', {
            vpc: vpc,
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
            machineImage: new ec2.AmazonLinuxImage({
                generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
                cpuType: ec2.AmazonLinuxCpuType.X86_64
            }),
            requireImdsv2: true,
            role: role,
            securityGroup: securityGroup,
            vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        });

        instance.node.addDependency(endpoint)
    }
}
