# terraform/main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1" # Default region
}

# -----------------------------------------------------
# 0. SSH Key Generation (Removed)
# -----------------------------------------------------
# Using AWS Systems Manager (SSM) instead of SSH for instance access

# -----------------------------------------------------
# 1. AWS IAM Role for EC2
# -----------------------------------------------------
resource "aws_iam_role" "ec2_role" {
  name = "ecommerce_ml_ec2_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ssm_policy" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "ecommerce_ml_ec2_profile"
  role = aws_iam_role.ec2_role.name
  depends_on = [aws_iam_role_policy_attachment.ssm_policy]
}

# -----------------------------------------------------
# 2. Security Group for EC2
# -----------------------------------------------------
resource "aws_security_group" "api_sg" {
  name        = "ecommerce_ml_api_sg"
  description = "Allow inbound HTTP traffic for FastAPI"

  ingress {
    description = "HTTP to API"
    from_port   = 8000
    to_port     = 8000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }



  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# -----------------------------------------------------
# 3. EC2 Instance (t3.micro - Free Tier)
# -----------------------------------------------------
# Find the latest Amazon Linux 2023 AMI
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }
}

resource "aws_instance" "ml_api" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro" # Free Tier eligible in many regions

  iam_instance_profile   = aws_iam_instance_profile.ec2_profile.name
  vpc_security_group_ids = [aws_security_group.api_sg.id]

  depends_on = [aws_iam_instance_profile.ec2_profile]

  user_data = <<-EOF
              #!/bin/bash
              # Update and install Docker
              dnf update -y
              dnf install -y docker git
              systemctl enable docker
              systemctl start docker
              usermod -a -G docker ec2-user
              
              # Install Docker Compose
              curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
              chmod +x /usr/local/bin/docker-compose
              
              # The source code will need to be pulled here later, or container pushed to ECR.
              # For now, this instance is ready to run the FastAPI Docker container.
              EOF

  tags = {
    Name = "ECommerce-ML-API"
  }
}

# -----------------------------------------------------
# Outputs
# -----------------------------------------------------
output "api_public_ip" {
  description = "The public IP of the FastAPI EC2 instance"
  value       = aws_instance.ml_api.public_ip
}

output "api_endpoint" {
  description = "The URL to access the API"
  value       = "http://${aws_instance.ml_api.public_ip}:8000"
}

# -----------------------------------------------------
# 4. S3 Bucket for Frontend Hosting
# -----------------------------------------------------

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

resource "aws_s3_bucket" "frontend_bucket" {
  bucket = "ecommerce-frontend-${random_id.bucket_suffix.hex}"
}

resource "aws_s3_bucket_public_access_block" "frontend_bucket_public_access" {
  bucket = aws_s3_bucket.frontend_bucket.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "frontend_bucket_policy" {
  bucket = aws_s3_bucket.frontend_bucket.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.frontend_bucket.arn}/*"
      },
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.frontend_bucket_public_access]
}

resource "aws_s3_bucket_website_configuration" "frontend_website" {
  bucket = aws_s3_bucket.frontend_bucket.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "404.html"
  }
}

output "frontend_website_url" {
  description = "The public URL of the Next.js Frontend Website"
  value       = "http://${aws_s3_bucket.frontend_bucket.bucket_regional_domain_name}"
}
