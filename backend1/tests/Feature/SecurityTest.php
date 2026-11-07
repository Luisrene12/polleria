<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\CierreCaja;
use App\Models\Negocio;
use App\Models\Producto;
use App\Models\TenantBillingSetting;
use App\Models\Usuario;
use App\Models\Venta;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SecurityTest extends TestCase
{
    use RefreshDatabase;

    private Negocio $negocioA;
    private Negocio $negocioB;
    private Usuario $adminA;
    private Usuario $cajeroA;
    private Usuario $adminB;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Crear Restaurante A y Restaurante B
        $this->negocioA = Negocio::create([
            'nombre_comercial' => 'Pollería Central',
            'razon_social'     => 'Pollería Central S.R.L.',
            'nit'              => '1020304050',
            'email'            => 'admin@central.com',
            'slug'             => 'central',
            'estado'           => 'activo',
        ]);

        TenantBillingSetting::create([
            'negocio_id'       => $this->negocioA->id,
            'billing_mode'     => 'solo_nota_venta',
            'receipt_enabled'  => true,
            'tax_integration_status' => 'pendiente',
        ]);

        $this->negocioB = Negocio::create([
            'nombre_comercial' => 'Pollería Norte',
            'razon_social'     => 'Pollería Norte S.R.L.',
            'nit'              => '9080706050',
            'email'            => 'admin@norte.com',
            'slug'             => 'norte',
            'estado'           => 'activo',
        ]);

        TenantBillingSetting::create([
            'negocio_id'       => $this->negocioB->id,
            'billing_mode'     => 'solo_nota_venta',
            'receipt_enabled'  => true,
            'tax_integration_status' => 'pendiente',
        ]);

        // 2. Usuarios Restaurante A
        $this->adminA = Usuario::create([
            'negocio_id' => $this->negocioA->id,
            'nombre'     => 'Admin Central',
            'username'   => 'admin_central',
            'pin_hash'   => Hash::make('1234'),
            'rol'        => 'admin',
            'activo'     => 1,
            'creado_en'  => now(),
        ]);

        $this->cajeroA = Usuario::create([
            'negocio_id' => $this->negocioA->id,
            'nombre'     => 'Cajero Central',
            'username'   => 'cajero_central',
            'pin_hash'   => Hash::make('1234'),
            'rol'        => 'seller',
            'activo'     => 1,
            'creado_en'  => now(),
        ]);

        // 3. Usuarios Restaurante B
        $this->adminB = Usuario::create([
            'negocio_id' => $this->negocioB->id,
            'nombre'     => 'Admin Norte',
            'username'   => 'admin_norte',
            'pin_hash'   => Hash::make('1234'),
            'rol'        => 'admin',
            'activo'     => 1,
            'creado_en'  => now(),
        ]);
    }

    /**
     * 1. Un usuario sin sesión no puede acceder a rutas privadas.
     */
    public function test_unauthenticated_user_cannot_access_private_routes(): void
    {
        $this->getJson('/api/productos')->assertStatus(401);
        $this->getJson('/api/usuarios')->assertStatus(401);
        $this->postJson('/api/ventas', [])->assertStatus(401);
        $this->getJson('/api/caja/estado')->assertStatus(401);
    }

    /**
     * 2. Un cajero (seller) no puede realizar funciones de administrador.
     */
    public function test_seller_cannot_perform_admin_functions(): void
    {
        Sanctum::actingAs($this->cajeroA);

        // No puede gestionar usuarios
        $this->getJson('/api/usuarios')->assertStatus(403);
        $this->postJson('/api/usuarios', [
            'nombre'   => 'Nuevo',
            'username' => 'nuevo_user',
            'pin'      => '1234',
            'rol'      => 'seller'
        ])->assertStatus(403);

        // No puede crear ni eliminar productos
        $this->postJson('/api/productos', [
            'nombre'       => 'Pollo Extra',
            'precio_venta' => 35
        ])->assertStatus(403);

        $this->deleteJson('/api/productos/1')->assertStatus(403);

        // No puede anular ventas
        $this->deleteJson('/api/ventas/1')->assertStatus(403);

        // No puede acceder a reportes de administración
        $this->getJson('/api/reportes/ventas-por-cajero')->assertStatus(403);
    }

    /**
     * 3. Aislamiento Multi-Tenant: Un restaurante no puede ver ni modificar usuarios de otro.
     */
    public function test_restaurant_cannot_access_or_modify_other_restaurant_users(): void
    {
        Sanctum::actingAs($this->adminA);

        // Consulta de usuarios: solo debe ver los del Restaurante A
        $response = $this->getJson('/api/usuarios')->assertStatus(200);
        $usernames = collect($response->json())->pluck('username');

        $this->assertTrue($usernames->contains('admin_central'));
        $this->assertTrue($usernames->contains('cajero_central'));
        $this->assertFalse($usernames->contains('admin_norte'));

        // Intento de IDOR: consultar por ID un usuario de otro restaurante
        $this->getJson("/api/usuarios/{$this->adminB->id}")->assertStatus(404);

        // Intento de modificar usuario de otro restaurante
        $this->putJson("/api/usuarios/{$this->adminB->id}", [
            'nombre' => 'Hackeado'
        ])->assertStatus(404);

        // Intento de eliminar usuario de otro restaurante
        $this->deleteJson("/api/usuarios/{$this->adminB->id}")->assertStatus(404);
    }

    /**
     * 4. Prevenir escalada de privilegios a Super Administrador por un admin de restaurante.
     */
    public function test_admin_cannot_escalate_privileges_to_super_admin(): void
    {
        Sanctum::actingAs($this->adminA);

        // Intentar crear un super_admin
        $this->postJson('/api/usuarios', [
            'nombre'   => 'Falso SuperAdmin',
            'username' => 'fake_super',
            'pin'      => '123456',
            'rol'      => 'super_admin'
        ])->assertStatus(422);

        // Intentar actualizar un usuario a super_admin
        $this->putJson("/api/usuarios/{$this->cajeroA->id}", [
            'rol' => 'super_admin'
        ])->assertStatus(422);
    }

    /**
     * 5. Prevención de Manipulación de Precios (Price Tampering) en Ventas.
     */
    public function test_price_tampering_is_prevented_in_sales(): void
    {
        Sanctum::actingAs($this->cajeroA);

        // Crear producto oficial con precio 45.00
        $producto = Producto::create([
            'negocio_id'   => $this->negocioA->id,
            'nombre'       => 'Cuarto de Pollo',
            'precio_venta' => 45.00,
            'descuento'    => 5.00, // Precio efectivo real: 40.00
            'stock'        => 20,
            'activo'       => 1,
            'creado_en'    => now(),
        ]);

        // Abrir caja para el cajero
        CierreCaja::create([
            'negocio_id'     => $this->negocioA->id,
            'usuario_id'     => $this->cajeroA->id,
            'monto_inicial'  => 100,
            'estado'         => 'abierto',
            'fecha_apertura' => now(),
        ]);

        // El cliente intenta enviar precio_unitario manipulado a 0.50
        $payload = [
            'tipo_comprobante' => 'nota_venta',
            'metodo_pago'      => 'efectivo',
            'monto_efectivo'   => 80.00,
            'items'            => [
                [
                    'producto_id'     => $producto->id,
                    'cantidad'        => 2,
                    'precio_unitario' => 0.50, // <-- Intento malicioso
                ]
            ]
        ];

        $response = $this->postJson('/api/ventas', $payload)->assertStatus(201);

        // El total DEBE ser 80.00 (40.00 * 2), ignorando por completo el 0.50 enviado
        $this->assertEquals(80.00, (float)$response->json('total'));

        $ventaDb = Venta::find($response->json('ventaId'));
        $this->assertEquals(80.00, (float)$ventaDb->total);
        $this->assertEquals(18, $producto->fresh()->stock);
    }

    /**
     * 6. Inyección cruzada: No se pueden vender productos de otro restaurante.
     */
    public function test_sale_cannot_include_products_from_another_restaurant(): void
    {
        // Producto en Restaurante B (creado antes de autenticar al cajero de A)
        $productoB = Producto::create([
            'negocio_id'   => $this->negocioB->id,
            'nombre'       => 'Plato Norte',
            'precio_venta' => 50.00,
            'stock'        => 10,
            'activo'       => 1,
            'creado_en'    => now(),
        ]);

        Sanctum::actingAs($this->cajeroA);

        // Abrir caja
        CierreCaja::create([
            'negocio_id'     => $this->negocioA->id,
            'usuario_id'     => $this->cajeroA->id,
            'monto_inicial'  => 100,
            'estado'         => 'abierto',
            'fecha_apertura' => now(),
        ]);

        $payload = [
            'tipo_comprobante' => 'nota_venta',
            'metodo_pago'      => 'efectivo',
            'items'            => [
                [
                    'producto_id' => $productoB->id,
                    'cantidad'    => 1,
                ]
            ]
        ];

        // Debe ser rechazado porque el producto no pertenece a la Pollería Central
        $this->postJson('/api/ventas', $payload)->assertStatus(422);
    }

    /**
     * 7. Bloqueo por suspensión: Restaurante suspendido no puede acceder al POS.
     */
    public function test_suspended_restaurant_is_blocked_by_middleware(): void
    {
        // Suspender Restaurante A
        $this->negocioA->update(['estado' => 'suspendido']);

        $cajero = $this->cajeroA->fresh();
        Sanctum::actingAs($cajero);

        // Debe devolver 403 Forbidden indicando suspensión
        $response = $this->getJson('/api/productos')->assertStatus(403);
        $response->assertJsonPath('suspended', true);

        $this->getJson('/api/caja/estado')->assertStatus(403);
    }

    /**
     * 8. Rate Limiting en Login: Máximo 5 intentos por minuto.
     */
    public function test_login_rate_limiting(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/login', [
                'username' => 'usuario_inexistente',
                'pin'      => '0000',
            ])->assertStatus(401);
        }

        // El 6to intento debe recibir 429 Too Many Requests
        $this->postJson('/api/auth/login', [
            'username' => 'usuario_inexistente',
            'pin'      => '0000',
        ])->assertStatus(429);
    }
}
