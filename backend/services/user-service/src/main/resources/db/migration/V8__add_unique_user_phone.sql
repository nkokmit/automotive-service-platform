-- Email đã unique từ V1; đặt tên rõ ràng để xử lý xung đột đồng thời nhất quán.
-- Phone để nullable để không buộc các tài khoản hiện hữu phải có số điện thoại.
ALTER TABLE users
    DROP INDEX email,
    ADD COLUMN phone VARCHAR(20) NULL AFTER email,
    ADD UNIQUE KEY uk_users_email (email),
    ADD UNIQUE KEY uk_users_phone (phone);
