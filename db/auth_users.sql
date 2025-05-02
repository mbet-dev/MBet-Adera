-- Clear all existing users from auth table
DELETE FROM auth.users;

-- Create auth users with their passwords
-- Admin
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at) VALUES
('00000000-0000-0000-0000-000000000001', 'admin@mbetadera.com', crypt('Admin123!', gen_salt('bf')), now(), now(), now());

-- Staff
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at) VALUES
('00000000-0000-0000-0000-000000000002', 'staff1@mbetadera.com', crypt('Staff123!', gen_salt('bf')), now(), now(), now()),
('00000000-0000-0000-0000-000000000003', 'staff2@mbetadera.com', crypt('Staff123!', gen_salt('bf')), now(), now(), now());

-- Couriers
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at) VALUES
('00000000-0000-0000-0000-000000000004', 'courier1@mbetadera.com', crypt('Courier123!', gen_salt('bf')), now(), now(), now()),
('00000000-0000-0000-0000-000000000005', 'courier2@mbetadera.com', crypt('Courier123!', gen_salt('bf')), now(), now(), now()),
('00000000-0000-0000-0000-000000000006', 'courier3@mbetadera.com', crypt('Courier123!', gen_salt('bf')), now(), now(), now());

-- Customers
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at) VALUES
('00000000-0000-0000-0000-000000000007', 'abel@mbetadera.com', crypt('Abel123!', gen_salt('bf')), now(), now(), now()),
('00000000-0000-0000-0000-000000000008', 'beza@mbetadera.com', crypt('Beza123!', gen_salt('bf')), now(), now(), now()),
('00000000-0000-0000-0000-000000000009', 'chala@mbetadera.com', crypt('Chala123!', gen_salt('bf')), now(), now(), now()),
('00000000-0000-0000-0000-000000000010', 'daniel@mbetadera.com', crypt('Daniel123!', gen_salt('bf')), now(), now(), now()),
('00000000-0000-0000-0000-000000000011', 'feven@mbetadera.com', crypt('Feven123!', gen_salt('bf')), now(), now(), now()),
('00000000-0000-0000-0000-000000000012', 'genet@mbetadera.com', crypt('Genet123!', gen_salt('bf')), now(), now(), now()),
('00000000-0000-0000-0000-000000000013', 'habtamu@mbetadera.com', crypt('Habtamu123!', gen_salt('bf')), now(), now(), now()),
('00000000-0000-0000-0000-000000000014', 'kidus@mbetadera.com', crypt('Kidus123!', gen_salt('bf')), now(), now(), now()),
('00000000-0000-0000-0000-000000000015', 'lemlem@mbetadera.com', crypt('Lemlem123!', gen_salt('bf')), now(), now(), now()),
('00000000-0000-0000-0000-000000000016', 'zelalem@mbetadera.com', crypt('Zelalem123!', gen_salt('bf')), now(), now(), now()); 