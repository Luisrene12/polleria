<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Ampliación de la tabla 'planes' para límites y opciones comerciales
        Schema::table('planes', function (Blueprint $table) {
            if (!Schema::hasColumn('planes', 'precio_anual')) {
                $table->decimal('precio_anual', 10, 2)->default(0.00)->after('precio');
            }
            if (!Schema::hasColumn('planes', 'dias_prueba')) {
                $table->integer('dias_prueba')->default(15)->after('frecuencia');
            }
            if (!Schema::hasColumn('planes', 'limite_productos')) {
                $table->integer('limite_productos')->default(100)->after('limite_usuarios');
            }
            if (!Schema::hasColumn('planes', 'limite_almacenamiento_mb')) {
                $table->integer('limite_almacenamiento_mb')->default(512)->after('limite_sucursales');
            }
        });

        // 2. Ampliación de 'usuarios' para telemetría y seguridad
        Schema::table('usuarios', function (Blueprint $table) {
            if (!Schema::hasColumn('usuarios', 'ultimo_login')) {
                $table->timestamp('ultimo_login')->nullable()->after('activo');
            }
            if (!Schema::hasColumn('usuarios', 'ip_ultimo_login')) {
                $table->string('ip_ultimo_login', 45)->nullable()->after('ultimo_login');
            }
        });

        // 3. Tabla de configuración global del SaaS
        if (!Schema::hasTable('saas_configuracion')) {
            Schema::create('saas_configuracion', function (Blueprint $table) {
                $table->id();
                $table->string('clave', 100)->unique();
                $table->text('valor')->nullable();
                $table->string('tipo', 50)->default('string'); // string, json, boolean, number
                $table->text('descripcion')->nullable();
                $table->timestamps();
            });

            // Insertar configuraciones base del SaaS
            DB::table('saas_configuracion')->insertOrIgnore([
                ['clave' => 'saas_nombre', 'valor' => 'POLLERÍA SaaS Pro', 'tipo' => 'string', 'descripcion' => 'Nombre comercial de la plataforma SaaS', 'created_at' => now(), 'updated_at' => now()],
                ['clave' => 'saas_moneda_base', 'valor' => 'BOB', 'tipo' => 'string', 'descripcion' => 'Moneda predeterminada para el SaaS (Bs. / BOB)', 'created_at' => now(), 'updated_at' => now()],
                ['clave' => 'saas_email_soporte', 'valor' => 'soporte@polleriasaas.com', 'tipo' => 'string', 'descripcion' => 'Correo de atención a clientes y tickets', 'created_at' => now(), 'updated_at' => now()],
                ['clave' => 'saas_telefono_soporte', 'valor' => '+591 70012345', 'tipo' => 'string', 'descripcion' => 'Línea WhatsApp de asistencia técnica', 'created_at' => now(), 'updated_at' => now()],
                ['clave' => 'saas_dominio_principal', 'valor' => 'polleriasaas.com', 'tipo' => 'string', 'descripcion' => 'Dominio raíz para subdominios automáticos', 'created_at' => now(), 'updated_at' => now()],
                ['clave' => 'saas_modo_mantenimiento', 'valor' => 'false', 'tipo' => 'boolean', 'descripcion' => 'Estado de mantenimiento de la plataforma', 'created_at' => now(), 'updated_at' => now()],
                ['clave' => 'saas_dias_gracia_default', 'valor' => '5', 'tipo' => 'number', 'descripcion' => 'Días de gracia por defecto tras vencimiento', 'created_at' => now(), 'updated_at' => now()],
                ['clave' => 'saas_zona_horaria', 'valor' => 'America/La_Paz', 'tipo' => 'string', 'descripcion' => 'Zona horaria del sistema', 'created_at' => now(), 'updated_at' => now()]
            ]);
        }

        // 4. Tabla de registro y control de respaldos (Backups)
        if (!Schema::hasTable('saas_backups')) {
            Schema::create('saas_backups', function (Blueprint $table) {
                $table->id();
                $table->string('archivo', 255);
                $table->bigInteger('peso_bytes')->unsigned()->default(0);
                $table->enum('tipo', ['database', 'files', 'full'])->default('database');
                $table->enum('estado', ['exitoso', 'fallido', 'en_proceso'])->default('exitoso');
                $table->foreignId('usuario_id')->nullable()->constrained('usuarios')->onDelete('set null');
                $table->text('notas')->nullable();
                $table->timestamps();
            });
        }

        // 5. Sembrado y actualización de los 14 Módulos comerciales en 'funcionalidades'
        $modulosEstandar = [
            ['codigo' => 'pos_ventas', 'nombre' => 'POS y Ventas Rápidas', 'descripcion' => 'Terminal de punto de venta táctil, generación de comandas y cobros rápidos', 'modulo' => 'ventas'],
            ['codigo' => 'caja_registradora', 'nombre' => 'Caja Registradora', 'descripcion' => 'Control de aperturas, cierres de turno, arqueos y control de efectivo', 'modulo' => 'caja'],
            ['codigo' => 'inventario', 'nombre' => 'Control de Inventario', 'descripcion' => 'Gestión de stock en tiempo real, kardex y alertas de reposición', 'modulo' => 'inventario'],
            ['codigo' => 'compras', 'nombre' => 'Gestión de Compras', 'descripcion' => 'Registro de compras de insumos, pollos enteros, papas y bebidas', 'modulo' => 'compras'],
            ['codigo' => 'proveedores', 'nombre' => 'Directorio de Proveedores', 'descripcion' => 'Catálogo de proveedores, cuentas por pagar y condiciones comerciales', 'modulo' => 'proveedores'],
            ['codigo' => 'clientes', 'nombre' => 'Gestión de Clientes', 'descripcion' => 'Base de datos de clientes, historial de consumo y puntos de fidelidad', 'modulo' => 'clientes'],
            ['codigo' => 'reportes_avanzados', 'nombre' => 'Reportes y Business Intelligence', 'descripcion' => 'Gráficos avanzados de rendimiento, horas pico, rentabilidad y ventas por cajero', 'modulo' => 'reportes'],
            ['codigo' => 'whatsapp_bot', 'nombre' => 'WhatsApp y Reportes Automáticos', 'descripcion' => 'Envío directo de resúmenes de cierre, alertas y tickets por WhatsApp', 'modulo' => 'whatsapp'],
            ['codigo' => 'delivery', 'nombre' => 'Módulo de Delivery', 'descripcion' => 'Control de pedidos a domicilio, repartidores y tiempos de entrega', 'modulo' => 'delivery'],
            ['codigo' => 'mesas', 'nombre' => 'Gestión de Mesas y Salón', 'descripcion' => 'Distribución de salón, comandas por mesa y estado de ocupación', 'modulo' => 'mesas'],
            ['codigo' => 'comandas_cocina', 'nombre' => 'KDS y Comandas de Cocina', 'descripcion' => 'Monitor digital para cocina, tiempos de preparación y despacho', 'modulo' => 'cocina'],
            ['codigo' => 'sucursales', 'nombre' => 'Gestión Multi-sucursales', 'descripcion' => 'Administración centralizada de locales, traspasos y stock por sucursal', 'modulo' => 'sucursales'],
            ['codigo' => 'empleados', 'nombre' => 'Control de Empleados', 'descripcion' => 'Gestión de turnos de trabajo, roles, cajeros y personal de cocina', 'modulo' => 'empleados'],
            ['codigo' => 'facturacion_electronica', 'nombre' => 'Facturación y Comprobantes', 'descripcion' => 'Emisión de tickets térmicos, facturas computarizadas y control tributario', 'modulo' => 'facturacion'],
        ];

        foreach ($modulosEstandar as $mod) {
            DB::table('funcionalidades')->updateOrInsert(
                ['codigo' => $mod['codigo']],
                [
                    'nombre' => $mod['nombre'],
                    'descripcion' => $mod['descripcion'],
                    'modulo' => $mod['modulo'],
                    'activo' => 1
                ]
            );
        }

        // 6. Asignar los módulos al Plan Profesional y Empresarial para que el negocio 1 los tenga
        $planPro = DB::table('planes')->where('id', 2)->first();
        if ($planPro) {
            $todasFunc = DB::table('funcionalidades')->pluck('id');
            foreach ($todasFunc as $funcId) {
                DB::table('plan_funcionalidad')->insertOrIgnore([
                    'plan_id' => $planPro->id,
                    'funcionalidad_id' => $funcId
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('saas_backups');
        Schema::dropIfExists('saas_configuracion');
        
        Schema::table('usuarios', function (Blueprint $table) {
            if (Schema::hasColumn('usuarios', 'ip_ultimo_login')) {
                $table->dropColumn('ip_ultimo_login');
            }
            if (Schema::hasColumn('usuarios', 'ultimo_login')) {
                $table->dropColumn('ultimo_login');
            }
        });

        Schema::table('planes', function (Blueprint $table) {
            if (Schema::hasColumn('planes', 'limite_almacenamiento_mb')) {
                $table->dropColumn('limite_almacenamiento_mb');
            }
            if (Schema::hasColumn('planes', 'limite_productos')) {
                $table->dropColumn('limite_productos');
            }
            if (Schema::hasColumn('planes', 'dias_prueba')) {
                $table->dropColumn('dias_prueba');
            }
            if (Schema::hasColumn('planes', 'precio_anual')) {
                $table->dropColumn('precio_anual');
            }
        });
    }
};

