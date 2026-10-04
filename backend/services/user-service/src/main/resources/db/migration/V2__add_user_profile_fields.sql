-- Bổ sung trường cho bảng users/roles/permissions phục vụ CRUD
-- Theo CONTEXT: Flyway là nguồn chính quản lý schema, không sửa V1 cũ.

-- deleted_at dùng cho soft delete: DELETE API set deleted_at; GET tự động filter.
ALTER TABLE users
    ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER updated_at;

-- Hỗ trợ truy vấn lọc user chưa xoá.
CREATE INDEX idx_users_deleted_at ON users (deleted_at);

-- Tên hiển thị thân thiện với UI cho Role/Permission.
ALTER TABLE roles
    ADD COLUMN display_name VARCHAR(100) NULL AFTER name,
    ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER updated_at;

CREATE INDEX idx_roles_deleted_at ON roles (deleted_at);

ALTER TABLE permissions
    ADD COLUMN display_name VARCHAR(100) NULL AFTER name,
    ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER updated_at;

CREATE INDEX idx_permissions_deleted_at ON permissions (deleted_at);
