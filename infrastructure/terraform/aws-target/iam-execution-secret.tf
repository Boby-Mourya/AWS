# Section 15 workload IAM: ECS must be able to resolve the RDS-managed master secret
# without broad Secrets Manager or KMS permissions. Runtime secret-service selection
# remains a Section 16 concern.
resource "aws_iam_role_policy" "task_execution_database_secret" {
  role = aws_iam_role.task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "ReadDatabaseSecret"
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = aws_db_instance.postgres.master_user_secret[0].secret_arn
      },
      {
        Sid      = "DecryptDatabaseSecret"
        Effect   = "Allow"
        Action   = ["kms:Decrypt"]
        Resource = aws_kms_key.platform.arn
      }
    ]
  })
}
