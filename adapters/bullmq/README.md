# BullMQ adapter

Implements `JobQueuePort` for the optional BullMQ provider. BullMQ is valid only when Redis is enabled; the dependency engine blocks BullMQ when Redis is unavailable and offers SQS/RabbitMQ/synchronous migration options. Business/domain code must depend on `JobQueuePort`, never BullMQ directly.
