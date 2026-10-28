-- Datos sinteticos para Supabase local. No ejecutar como migracion productiva.
-- El trigger final exige una sesion Auth incluso para INSERT historicos con UUID
-- NULL; el seed de operador lo suspende solo dentro de esta transaccion.
begin;

alter table public.clientes disable trigger clientes_prepare_responsible;

insert into public.clientes (nombres, apellidos, empresa, correo, telefono, cargo, estado, direccion, notas, responsable)
values
('Carlos', 'Mendoza', 'NovaTech SAC', 'carlos.mendoza@example.com', '+51 987 654 321', 'Gerente', 'Activo', '', '', 'Ana García'),
('Andrea', 'Torres', 'Grupo Andino', 'andrea.torres@example.com', '+51 987 654 322', 'Directora', 'Prospecto', '', '', 'Ana García'),
('Luis', 'Ramírez', 'Inversiones Norte', 'luis.ramirez@example.com', '+51 987 654 323', 'Gerente', 'Activo', '', '', 'Ana García'),
('Mariana', 'López', 'Digital Solutions', 'mariana.lopez@example.com', '+51 987 654 324', 'Directora', 'Prospecto', '', '', 'Ana García'),
('Diego', 'Fernández', 'Constructora Horizonte', 'diego.fernandez@example.com', '+51 987 654 325', 'Gerente', 'Inactivo', '', '', 'Ana García')
on conflict do nothing;

alter table public.clientes enable trigger clientes_prepare_responsible;

commit;
