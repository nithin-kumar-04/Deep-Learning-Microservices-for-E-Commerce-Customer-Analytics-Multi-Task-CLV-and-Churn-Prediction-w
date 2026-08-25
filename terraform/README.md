# AWS Deployment Guide

This document explains how to set up the necessary tools to deploy your E-Commerce Analytics infrastructure to AWS using Terraform.

## Prerequisites

Since you do not have the AWS CLI installed, please follow these steps:

### 1. Install AWS CLI
Download and install the AWS CLI for Windows using the official MSI installer:
- [AWS CLI MSI Installer for Windows](https://awscli.amazonaws.com/AWSCLIV2.msi)
- Run the installer and follow the standard installation prompts.

### 2. Configure AWS Credentials
Once installed, open a new PowerShell terminal and run:
```bash
aws configure
```
You will be prompted to enter:
- **AWS Access Key ID**: (Get this from your AWS Console -> Security Credentials)
- **AWS Secret Access Key**: (Get this from your AWS Console)
- **Default region name**: `us-east-1` (or your preferred region)
- **Default output format**: `json`

### 3. Install Terraform
Terraform is the tool we are using to automate the infrastructure setup.
- Download Terraform for Windows from [HashiCorp's Website](https://developer.hashicorp.com/terraform/install).
- Extract the `.zip` file (it contains a single `terraform.exe` file).
- Move `terraform.exe` to a permanent location (e.g., `C:\terraform`).
- Add that directory to your Windows System `PATH` environment variable.

### 4. Deploy the Infrastructure

Once the AWS CLI and Terraform are installed and configured, open a PowerShell terminal in the `terraform` directory:

```bash
cd c:\Users\DELL\OneDrive\Desktop\b.tech\e-commerce\ecommerce-analytics\terraform
```

Initialize Terraform (downloads the AWS provider):
```bash
terraform init
```

Preview the changes (optional):
```bash
terraform plan
```

Deploy the resources (it will prompt for `yes`):
```bash
terraform apply
```

After successful deployment, Terraform will output the `api_public_ip` and `api_endpoint`.

### Next Steps for the App
After the EC2 instance is running, we will deploy the Next.js frontend to **AWS Amplify**. 
Amplify allows you to connect a GitHub repository or drag-and-drop the build folder directly in the AWS Console for a seamless free-tier hosting experience.
