# AWS EC2 Instance Connect Endpoint CDK demo

This demo stack allows you to configure the new [AWS EC2 Instance Connect Endpoint](https://aws.amazon.com/blogs/compute/secure-connectivity-from-public-to-private-introducing-ec2-instance-connect-endpoint-june-13-2023/) 
within your VPC to allow SSH access to EC2 instances in a totally private network without needing a NAT gateway and
hourly pricing for an SSM endpoint.

At the time that this CDK was written there was no native CloudFormation support for the EC2 Instance Connect Endpoint
and a Custom Resource is used to work around this. A limitation with the Custom Resource is there is no way to update an
EC2 Instance Connect Endpoint once it is deployed. 

The IAM permissions for the current demo are overly permissive.

## Deploy the stack

```bash
cdk deploy
```

## SSH Configuration

Add the following to your `~/.ssh/config` file:

```bash
Host i-*
  User ec2-user
  ProxyCommand sh -c "aws ec2-instance-connect send-ssh-public-key --instance-id %h --region [region] --instance-os-user %r --ssh-public-key file://[path to SSH public key] > /dev/null && aws ec2-instance-connect open-tunnel --instance-id %h"
```

You will need to adjust the `[region]` to specify the AWS region that your EC2 instance exists in. Adjust the 
`[path to SSH public key]` to be the filesystem path to your SSH public key. The [send-ssh-public-key](https://docs.aws.amazon.com/cli/latest/reference/ec2-instance-connect/send-ssh-public-key.html) 
command makes the SSH public key available to the EC2 instance for a period of 60 seconds. Using the 
`send-ssh-public-key` command avoids needing to add SSH public keys when the EC2 instance is deployed.

## SSH

Once the stack is deployed and EC2 instance is up you should be able to use slogin/ssh and scp to access your EC2 instance. 

The above configuration presumes that your AWS profile is the default profile. If it is not you can override for example:

`AWS_PROFILE=other-profile slogin [EC2 instance ID]`
