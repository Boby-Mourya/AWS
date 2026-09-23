output "vpc_id" { value=aws_vpc.main.id }
output "public_subnet_ids" { value=values(aws_subnet.public)[*].id }
output "application_subnet_ids" { value=values(aws_subnet.app)[*].id }
output "data_subnet_ids" { value=values(aws_subnet.data)[*].id }
output "cloudfront_domain_name" { value=aws_cloudfront_distribution.edge.domain_name }
output "alb_dns_name" { value=aws_lb.app.dns_name }
output "database_endpoint" { value=aws_db_instance.postgres.address sensitive=true }
output "database_secret_arn" { value=aws_db_instance.postgres.master_user_secret[0].secret_arn sensitive=true }
output "object_bucket" { value=aws_s3_bucket.objects.bucket }
output "jobs_queue_url" { value=aws_sqs_queue.jobs.url }
output "redis_primary_endpoint" { value=var.redis_enabled?aws_elasticache_replication_group.redis[0].primary_endpoint_address:null sensitive=true }
output "opensearch_endpoint" { value=var.opensearch_enabled?aws_opensearch_domain.search[0].endpoint:null sensitive=true }
output "msk_bootstrap_brokers_tls" { value=var.msk_enabled?aws_msk_cluster.events[0].bootstrap_brokers_tls:null sensitive=true }
output "ecs_cluster" { value=var.compute_provider=="ecs"?aws_ecs_cluster.main[0].name:null }
output "eks_cluster" { value=var.compute_provider=="eks"?aws_eks_cluster.main[0].name:null }
output "ecr_repository_url" { value=aws_ecr_repository.app.repository_url }
output "kms_key_arn" { value=aws_kms_key.platform.arn }
