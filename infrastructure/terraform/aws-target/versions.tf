terraform {
  required_version = ">= 1.7.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" {
  region = var.region
  default_tags { tags = merge(var.tags,{ManagedBy="Terraform",Platform="pluggable-aws-platform",Environment=var.environment}) }
}

# CloudFront-scoped WAF resources must be created in us-east-1.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
  default_tags { tags = merge(var.tags,{ManagedBy="Terraform",Platform="pluggable-aws-platform",Environment=var.environment}) }
}
