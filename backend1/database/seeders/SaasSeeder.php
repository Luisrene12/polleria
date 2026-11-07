<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class SaasSeeder extends Seeder
{
    public function run(): void
    {
        // Si el usuario superadmin ya existe, omitir para no duplicar datos
        if (DB::table('usuarios')->where('username', 'superadmin')->exists()) {
            $this->command->info('ℹ️  Los datos y usuarios iniciales ya existen. Omitiendo seeders.');
            return;
        }

        // ─── 1. SUPER ADMIN GLOBAL (negocio_id = null) ───────────────────────────
        $superAdminId = DB::table('usuarios')->insertGetId([
            'negocio_id' => null,
            'nombre'     => 'Super Administrador SaaS',
            'username'   => 'superadmin',
            'pin_hash'   => Hash::make('1234'),
            'rol'        => 'super_admin',
            'activo'     => 1,
            'creado_en'  => now(),
        ]);

        // ─── 2. CATÁLOGO DE PLANES SAAS ──────────────────────────────────────────
        $planBasicoId = DB::table('planes')->insertGetId([
            'nombre'           => 'Plan Básico',
            'descripcion'      => 'Ideal para pequeños restaurantes y puestos de comida.',
            'precio'           => 150.00,
            'moneda'           => 'BOB',
            'frecuencia'       => 'mensual',
            'limite_usuarios'  => 3,
            'limite_sucursales'=> 1,
            'activo'           => true,
            'orden'            => 1,
            'created_at'       => now(),
            'updated_at'       => now(),
        ]);

        $planProId = DB::table('planes')->insertGetId([
            'nombre'           => 'Plan Profesional',
            'descripcion'      => 'Para pollerías y restaurantes con alto volumen y control de inventario.',
            'precio'           => 280.00,
            'moneda'           => 'BOB',
            'frecuencia'       => 'mensual',
            'limite_usuarios'  => 10,
            'limite_sucursales'=> 3,
            'activo'           => true,
            'orden'            => 2,
            'created_at'       => now(),
            'updated_at'       => now(),
        ]);

        $planEmpresarialId = DB::table('planes')->insertGetId([
            'nombre'           => 'Plan Empresarial',
            'descripcion'      => 'Cadenas, sucursales ilimitadas y soporte prioritario.',
            'precio'           => 500.00,
            'moneda'           => 'BOB',
            'frecuencia'       => 'mensual',
            'limite_usuarios'  => 50,
            'limite_sucursales'=> 10,
            'activo'           => true,
            'orden'            => 3,
            'created_at'       => now(),
            'updated_at'       => now(),
        ]);

        // ─── 3. CATÁLOGO DE FUNCIONALIDADES ──────────────────────────────────────
        $modulos = [
            ['codigo' => 'pos_ventas',          'nombre' => 'Punto de Venta (POS)',           'descripcion' => 'Ventas rápidas, emisión de tickets y cobro QR', 'modulo' => 'ventas',    'activo' => true],
            ['codigo' => 'caja_cierres',        'nombre' => 'Apertura y Cierre de Caja',     'descripcion' => 'Arqueo, diferencias y control de caja',         'modulo' => 'caja',      'activo' => true],
            ['codigo' => 'inventario_basico',   'nombre' => 'Inventario Básico',             'descripcion' => 'Control de stock y alertas mínimas',            'modulo' => 'inventario','activo' => true],
            ['codigo' => 'inventario_avanzado', 'nombre' => 'Control de Costos y Márgenes',  'descripcion' => 'Cálculo de costos por producto y margen bruto', 'modulo' => 'inventario','activo' => true],
            ['codigo' => 'reportes_basicos',    'nombre' => 'Reportes de Venta Diaria',      'descripcion' => 'Totales por método de pago y ventas por día',   'modulo' => 'reportes',  'activo' => true],
            ['codigo' => 'reportes_avanzados',  'nombre' => 'Dashboard y Gráficos Pro',      'descripcion' => 'Métricas avanzadas, mejores horas y tendencias', 'modulo' => 'reportes',  'activo' => true],
            ['codigo' => 'usuarios_roles',      'nombre' => 'Control de Cajeros y Admins',   'descripcion' => 'Múltiples empleados con accesos segmentados',   'modulo' => 'usuarios',  'activo' => true],
            ['codigo' => 'backup_export',       'nombre' => 'Exportación de Datos / Backup', 'descripcion' => 'Descarga de datos e informes en Excel/JSON',    'modulo' => 'sistema',   'activo' => true],
        ];

        $funcMap = [];
        foreach ($modulos as $mod) {
            $id = DB::table('funcionalidades')->insertGetId($mod);
            $funcMap[$mod['codigo']] = $id;
        }

        // Asignar funcionalidades a Planes
        // Básico
        foreach (['pos_ventas', 'caja_cierres', 'inventario_basico', 'reportes_basicos', 'usuarios_roles'] as $cod) {
            DB::table('plan_funcionalidad')->insert([
                'plan_id'          => $planBasicoId,
                'funcionalidad_id' => $funcMap[$cod],
            ]);
        }
        // Profesional (todos excepto soporte empresarial)
        foreach (array_keys($funcMap) as $cod) {
            DB::table('plan_funcionalidad')->insert([
                'plan_id'          => $planProId,
                'funcionalidad_id' => $funcMap[$cod],
            ]);
        }
        // Empresarial (todos)
        foreach (array_keys($funcMap) as $cod) {
            DB::table('plan_funcionalidad')->insert([
                'plan_id'          => $planEmpresarialId,
                'funcionalidad_id' => $funcMap[$cod],
            ]);
        }

        // ─── 4. NEGOCIO DEMO INICIAL ("Pollería Delicias El Pollón") ─────────────
        $negocioId = DB::table('negocios')->insertGetId([
            'nombre_comercial' => 'Pollería Delicias El Pollón',
            'razon_social'     => 'Delicias El Pollón S.R.L.',
            'nit'              => '1029384021',
            'email'            => 'contacto@elpollon.bo',
            'telefono'         => '70012345',
            'direccion'        => 'Av. 6 de Agosto #450, Sopocachi',
            'ciudad'           => 'La Paz',
            'departamento'     => 'La Paz',
            'rubro'            => 'polleria',
            'estado'           => 'activo',
            'slug'             => 'el-pollon',
            'created_at'       => now(),
            'updated_at'       => now(),
        ]);

        // Dominio
        DB::table('dominios')->insert([
            'negocio_id' => $negocioId,
            'subdominio' => 'el-pollon',
            'principal'  => true,
            'activo'     => true,
            'creado_en'  => now(),
        ]);

        // Suscripción activa al Plan Profesional
        $suscripcionId = DB::table('suscripciones')->insertGetId([
            'negocio_id'   => $negocioId,
            'plan_id'      => $planProId,
            'fecha_inicio' => Carbon::now(),
            'fecha_fin'    => Carbon::now()->addMonth(),
            'estado'       => 'activa',
            'dias_gracia'  => 5,
            'observaciones'=> 'Suscripción inicial demo activa',
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);

        // Registro de pago inicial verificado
        DB::table('pagos_suscripcion')->insert([
            'suscripcion_id'     => $suscripcionId,
            'negocio_id'         => $negocioId,
            'monto'              => 280.00,
            'moneda'             => 'BOB',
            'metodo_pago'        => 'qr',
            'referencia'         => 'QR-DEMO-001',
            'estado'             => 'verificado',
            'verificado_por'     => $superAdminId,
            'fecha_pago'         => now(),
            'fecha_verificacion' => now(),
            'observaciones'      => 'Pago de activación SaaS demo verificado',
            'creado_en'          => now(),
        ]);

        // ─── 5. USUARIOS DEL NEGOCIO ─────────────────────────────────────────────
        // Admin del negocio: admin / 1234 (mismas credenciales que antes para no romper acceso)
        DB::table('usuarios')->insert([
            'negocio_id' => $negocioId,
            'nombre'     => 'Administrador El Pollón',
            'username'   => 'admin',
            'pin_hash'   => Hash::make('1234'),
            'rol'        => 'admin',
            'activo'     => 1,
            'creado_en'  => now(),
        ]);

        // Cajero del negocio: cajero / 1234
        DB::table('usuarios')->insert([
            'negocio_id' => $negocioId,
            'nombre'     => 'Cajero de Turno',
            'username'   => 'cajero',
            'pin_hash'   => Hash::make('1234'),
            'rol'        => 'seller',
            'activo'     => 1,
            'creado_en'  => now(),
        ]);

        // ─── 6. CATEGORÍAS Y PRODUCTOS INICIALES PARA EL NEGOCIO ─────────────────
        $pollosId = DB::table('categorias')->insertGetId([
            'negocio_id'  => $negocioId,
            'nombre'      => 'Pollos',
            'descripcion' => 'Pollos enteros, medios y piezas a la brasa',
            'activa'      => 1,
            'creado_en'   => now(),
        ]);

        $bebidasId = DB::table('categorias')->insertGetId([
            'negocio_id'  => $negocioId,
            'nombre'      => 'Bebidas',
            'descripcion' => 'Refrescos, sodas y jugos naturales',
            'activa'      => 1,
            'creado_en'   => now(),
        ]);

        $guarnId = DB::table('categorias')->insertGetId([
            'negocio_id'  => $negocioId,
            'nombre'      => 'Guarniciones',
            'descripcion' => 'Papas fritas, plátanos, ensaladas y arroz',
            'activa'      => 1,
            'creado_en'   => now(),
        ]);

        $menusId = DB::table('categorias')->insertGetId([
            'negocio_id'  => $negocioId,
            'nombre'      => 'Combos & Menús',
            'descripcion' => 'Combos económicos con guarnición y bebida',
            'activa'      => 1,
            'creado_en'   => now(),
        ]);

        $productos = [
            ['codigo' => 'P001', 'nombre' => 'Pollo Entero a la Brasa', 'precio_venta' => 45.00, 'costo' => 25.00, 'stock' => 50,  'minStock' => 5,  'categoria_id' => $pollosId,  'activo' => 1, 'negocio_id' => $negocioId, 'creado_en' => now()],
            ['codigo' => 'P002', 'nombre' => 'Cuarto de Pollo Tradicional', 'precio_venta' => 15.00, 'costo' => 8.00,  'stock' => 80,  'minStock' => 10, 'categoria_id' => $pollosId,  'activo' => 1, 'negocio_id' => $negocioId, 'creado_en' => now()],
            ['codigo' => 'P003', 'nombre' => 'Medio Pollo con Salsas',   'precio_venta' => 25.00, 'costo' => 13.00, 'stock' => 60,  'minStock' => 5,  'categoria_id' => $pollosId,  'activo' => 1, 'negocio_id' => $negocioId, 'creado_en' => now()],
            ['codigo' => 'B001', 'nombre' => 'Coca Cola 500ml',         'precio_venta' => 5.00,  'costo' => 2.50,  'stock' => 100, 'minStock' => 20, 'categoria_id' => $bebidasId, 'activo' => 1, 'negocio_id' => $negocioId, 'creado_en' => now()],
            ['codigo' => 'B002', 'nombre' => 'Agua Mineral Vital 500ml','precio_venta' => 3.00,  'costo' => 1.00,  'stock' => 100, 'minStock' => 20, 'categoria_id' => $bebidasId, 'activo' => 1, 'negocio_id' => $negocioId, 'creado_en' => now()],
            ['codigo' => 'G001', 'nombre' => 'Porción Papas Fritas',    'precio_venta' => 8.00,  'costo' => 3.00,  'stock' => 200, 'minStock' => 30, 'categoria_id' => $guarnId,   'activo' => 1, 'negocio_id' => $negocioId, 'creado_en' => now()],
            ['codigo' => 'M001', 'nombre' => 'Combo 1: Cuarto + Papa + Soda', 'precio_venta' => 22.00, 'costo' => 11.00, 'stock' => 50,  'minStock' => 5,  'categoria_id' => $menusId,   'activo' => 1, 'negocio_id' => $negocioId, 'creado_en' => now()],
        ];

        foreach ($productos as $prod) {
            DB::table('productos')->insert($prod);
        }

        $this->command->info('✅ SaasSeeder completado con éxito:');
        $this->command->info('   - Super Admin: superadmin / 1234');
        $this->command->info('   - Planes: Básico (150 BOB), Profesional (280 BOB), Empresarial (500 BOB)');
        $this->command->info('   - Negocio Demo: Pollería Delicias El Pollón (slug: el-pollon)');
        $this->command->info('   - Admin Negocio: admin / 1234');
        $this->command->info('   - Cajero Negocio: cajero / 1234');
    }
}
