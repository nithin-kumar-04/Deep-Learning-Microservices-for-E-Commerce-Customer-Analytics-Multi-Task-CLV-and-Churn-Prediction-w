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
# 0. SSH Key Generation
# -----------------------------------------------------
resource "tls_private_key" "pk" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "kp" {
  key_name   = "ecommerce-key"
  public_key = tls_private_key.pk.public_key_openssh
}

resource "local_file" "pem_file" {
  filename        = "${path.module}/ecommerce-key.pem"
  content         = tls_private_key.pk.private_key_pem
}

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

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
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
  key_name               = aws_key_pair.kp.key_name

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
