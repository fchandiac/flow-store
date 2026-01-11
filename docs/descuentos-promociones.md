# Documentación Técnica: Descuentos y Promociones

Este documento describe el modelo de descuentos, promociones, cupones y las reglas de aplicación en el proceso de venta.

---

## 1. Tipos de Descuentos

### 1.1 Clasificación General

| Tipo | Aplicación | Ejemplo |
|------|------------|---------|
| **Descuento Manual** | Por línea o total | Cajero aplica 10% |
| **Promoción Automática** | Sistema detecta condición | 2x1 en bebidas |
| **Cupón** | Cliente presenta código | VERANO20 = 20% |
| **Precio Especial** | Lista de precios | Cliente mayorista |

### 1.2 Nivel de Aplicación

| Nivel | Descripción |
|-------|-------------|
| **Línea** | Descuento sobre un producto específico |
| **Subtotal** | Descuento sobre suma antes de impuestos |
| **Total** | Descuento sobre monto final |

---

## 2. Entidades Principales

### 2.1 Promotion (Promoción)

```
Promotion
├── id: UUID
├── company_id: UUID (FK)
├── code: string (único)
├── name: string
├── description: string
│
├── type: enum (PERCENTAGE, FIXED_AMOUNT, NXM, BUY_X_GET_Y, BUNDLE)
├── value: decimal (% o monto fijo)
│
├── applies_to: enum (PRODUCT, CATEGORY, BRAND, ALL)
├── target_ids: UUID[] (productos/categorías/marcas)
│
├── min_quantity: decimal
├── min_amount: decimal
├── max_uses: integer (total)
├── max_uses_per_customer: integer
├── current_uses: integer
│
├── start_date: datetime
├── end_date: datetime
├── active_days: string[] (MON, TUE, etc.)
├── active_hours_start: time
├── active_hours_end: time
│
├── stackable: boolean (combinable con otras)
├── priority: integer (mayor = primero)
├── is_active: boolean
│
├── branch_ids: UUID[] (sucursales, vacío = todas)
└── customer_segment_ids: UUID[] (segmentos, vacío = todos)
```

### 2.2 PromotionCondition (Condiciones Adicionales)

```
PromotionCondition
├── id: UUID
├── promotion_id: UUID (FK)
├── type: enum (MIN_ITEMS, MIN_AMOUNT, PAYMENT_METHOD, CUSTOMER_TYPE, FIRST_PURCHASE)
├── operator: enum (EQUALS, GREATER_THAN, LESS_THAN, IN, NOT_IN)
├── value: string (JSON)
└── is_required: boolean
```

### 2.3 Coupon (Cupón)

```
Coupon
├── id: UUID
├── company_id: UUID (FK)
├── promotion_id: UUID (FK)
├── code: string (único, lo que ingresa el cliente)
├── type: enum (SINGLE_USE, MULTI_USE, UNLIMITED)
│
├── max_uses: integer
├── current_uses: integer
├── max_uses_per_customer: integer
│
├── valid_from: datetime
├── valid_to: datetime
│
├── assigned_customer_id: UUID (FK, nullable) -- cupón personal
├── is_active: boolean
└── metadata: JSON
```

### 2.4 CouponUsage (Uso de Cupón)

```
CouponUsage
├── id: UUID
├── coupon_id: UUID (FK)
├── sale_id: UUID (FK)
├── customer_id: UUID (FK, nullable)
├── discount_amount: decimal
├── used_at: timestamp
└── metadata: JSON
```

---

## 3. Tipos de Promociones

### 3.1 PERCENTAGE (Porcentaje)

```
Promotion
├── type: PERCENTAGE
├── value: 20 (20% de descuento)
├── applies_to: CATEGORY
└── target_ids: [categoria_bebidas_id]

Resultado: 20% off en todas las bebidas
```

### 3.2 FIXED_AMOUNT (Monto Fijo)

```
Promotion
├── type: FIXED_AMOUNT
├── value: 5000 ($5,000 de descuento)
├── min_amount: 30000 (compras sobre $30,000)
└── applies_to: ALL

Resultado: $5,000 off en compras sobre $30,000
```

### 3.3 NXM (Lleva N, Paga M)

```
Promotion
├── type: NXM
├── value: null
├── applies_to: PRODUCT
├── target_ids: [coca_cola_2l_id]
└── metadata: {
        take_quantity: 3,  // Lleva 3
        pay_quantity: 2    // Paga 2
    }

Resultado: 3x2 en Coca-Cola 2L
```

### 3.4 BUY_X_GET_Y (Compra X, Lleva Y)

```
Promotion
├── type: BUY_X_GET_Y
├── applies_to: PRODUCT
├── target_ids: [producto_x_id]
└── metadata: {
        buy_quantity: 2,
        buy_product_ids: [producto_x_id],
        get_quantity: 1,
        get_product_ids: [producto_y_id],
        get_discount: 100  // 100% = gratis
    }

Resultado: Compra 2 X, lleva 1 Y gratis
```

### 3.5 BUNDLE (Combo)

```
Promotion
├── type: BUNDLE
├── value: 15000 (precio del combo)
└── metadata: {
        bundle_items: [
            { product_id: "hamburguesa", quantity: 1 },
            { product_id: "papas", quantity: 1 },
            { product_id: "bebida", quantity: 1 }
        ],
        regular_price: 18500
    }

Resultado: Combo a $15,000 (ahorro $3,500)
```

---

## 4. Motor de Promociones

### 4.1 Algoritmo de Aplicación

```
┌─────────────────────────────────────────────────────────────────┐
│              MOTOR DE PROMOCIONES                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  INPUT: Cart (líneas de venta)                                 │
│                                                                 │
│  1. OBTENER PROMOCIONES ACTIVAS                                │
│     ├── Filtrar por fecha/hora actual                          │
│     ├── Filtrar por sucursal                                   │
│     ├── Filtrar por segmento cliente                           │
│     └── Ordenar por prioridad DESC                             │
│                                                                 │
│  2. POR CADA PROMOCIÓN (en orden):                             │
│     │                                                          │
│     ├── VALIDAR CONDICIONES                                    │
│     │   ├── ¿Aplica a productos del carrito?                   │
│     │   ├── ¿Cumple cantidad mínima?                           │
│     │   ├── ¿Cumple monto mínimo?                              │
│     │   ├── ¿Cliente elegible?                                 │
│     │   └── ¿Usos disponibles?                                 │
│     │                                                          │
│     ├── SI CUMPLE:                                             │
│     │   ├── Calcular descuento                                 │
│     │   ├── Aplicar a líneas correspondientes                  │
│     │   └── Si no es stackable → BREAK                         │
│     │                                                          │
│     └── SI NO CUMPLE: Siguiente promoción                      │
│                                                                 │
│  3. APLICAR CUPÓN (si existe)                                  │
│     ├── Validar código                                         │
│     ├── Validar vigencia                                       │
│     ├── Validar usos                                           │
│     └── Calcular y aplicar descuento                           │
│                                                                 │
│  OUTPUT: Cart con descuentos aplicados                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Cálculo de Descuento por Tipo

```javascript
function calculateDiscount(promotion, applicableLines) {
    switch (promotion.type) {
        case 'PERCENTAGE':
            return applicableLines.reduce((sum, line) => 
                sum + (line.subtotal * promotion.value / 100), 0);
        
        case 'FIXED_AMOUNT':
            return promotion.value;
        
        case 'NXM':
            const { take_quantity, pay_quantity } = promotion.metadata;
            const totalQty = applicableLines.reduce((sum, l) => sum + l.quantity, 0);
            const sets = Math.floor(totalQty / take_quantity);
            const freeItems = sets * (take_quantity - pay_quantity);
            const avgPrice = applicableLines[0].unit_price; // simplificado
            return freeItems * avgPrice;
        
        case 'BUNDLE':
            const regularPrice = promotion.metadata.regular_price;
            return regularPrice - promotion.value;
    }
}
```

### 4.3 Prioridad y Stackability

```
Ejemplo de resolución:

Promociones activas:
1. "20% Bebidas" (priority: 10, stackable: false)
2. "2x1 Coca-Cola" (priority: 20, stackable: false)
3. "5% en todo" (priority: 5, stackable: true)

Carrito: 4 Coca-Cola 2L

Proceso:
1. Evaluar "2x1 Coca-Cola" (mayor prioridad)
   → Aplica: 2 gratis de 4
   → stackable: false → NO seguir

Resultado: Solo aplica 2x1
```

---

## 5. Cupones

### 5.1 Flujo de Cupón

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUJO DE CUPÓN                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. GENERACIÓN                                                 │
│     ├── Manual (admin crea códigos)                            │
│     ├── Automática (sistema genera por evento)                 │
│     └── Bulk (importación masiva)                              │
│                                                                 │
│  2. DISTRIBUCIÓN                                               │
│     ├── Email marketing                                        │
│     ├── En ticket de compra                                    │
│     └── Redes sociales                                         │
│                                                                 │
│  3. APLICACIÓN (en venta)                                      │
│     ├── Cliente proporciona código                             │
│     ├── Sistema valida                                         │
│     ├── Calcula descuento                                      │
│     └── Registra uso                                           │
│                                                                 │
│  4. TRACKING                                                   │
│     ├── CouponUsage por cada uso                               │
│     └── Métricas de efectividad                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Validación de Cupón

```javascript
function validateCoupon(code, cart, customer) {
    const coupon = findCouponByCode(code);
    
    if (!coupon) return { valid: false, error: 'Cupón no existe' };
    if (!coupon.is_active) return { valid: false, error: 'Cupón inactivo' };
    
    const now = new Date();
    if (now < coupon.valid_from) return { valid: false, error: 'Cupón aún no vigente' };
    if (now > coupon.valid_to) return { valid: false, error: 'Cupón expirado' };
    
    if (coupon.type === 'SINGLE_USE' && coupon.current_uses >= 1)
        return { valid: false, error: 'Cupón ya utilizado' };
    
    if (coupon.max_uses && coupon.current_uses >= coupon.max_uses)
        return { valid: false, error: 'Cupón agotado' };
    
    if (coupon.assigned_customer_id && coupon.assigned_customer_id !== customer?.id)
        return { valid: false, error: 'Cupón no válido para este cliente' };
    
    if (customer && coupon.max_uses_per_customer) {
        const customerUses = countUsagesByCustomer(coupon.id, customer.id);
        if (customerUses >= coupon.max_uses_per_customer)
            return { valid: false, error: 'Límite de usos alcanzado' };
    }
    
    // Validar promoción asociada
    const promotion = getPromotion(coupon.promotion_id);
    const promoValid = validatePromotionConditions(promotion, cart, customer);
    if (!promoValid.valid) return promoValid;
    
    return { valid: true, coupon, promotion };
}
```

---

## 6. Descuentos en la Venta

### 6.1 Estructura en SaleLine

```
SaleLine
├── unit_price: 10000       // Precio original
├── discount_percent: 20    // % descuento
├── discount_amount: 2000   // Monto descuento
├── subtotal: 8000          // Precio con descuento (sin impuestos)
├── tax_amount: 1520        // IVA sobre subtotal
├── total: 9520             // Total línea
└── metadata: {
        promotion_id: "uuid",
        promotion_name: "20% Bebidas",
        original_price: 10000
    }
```

### 6.2 Estructura en Sale

```
Sale
├── subtotal: 80000         // Suma líneas (con descuentos de línea)
├── discount_amount: 5000   // Descuento adicional a nivel de venta
├── tax_amount: 14250       // IVA sobre (subtotal - discount)
├── total: 89250            // Total final
└── metadata: {
        applied_promotions: [
            { id: "uuid1", name: "20% Bebidas", discount: 2000 },
            { id: "uuid2", name: "5% Total", discount: 5000 }
        ],
        coupon_code: "VERANO20",
        coupon_discount: 5000
    }
```

---

## 7. Reglas de Negocio

### 7.1 Restricciones de Promociones

| Regla | Descripción |
|-------|-------------|
| No acumulables | Por defecto, no se combinan promociones |
| Mejor precio | Si hay conflicto, aplica la más beneficiosa |
| Límite de descuento | Máximo 50% del subtotal (configurable) |
| Productos excluidos | Algunas categorías pueden excluirse |

### 7.2 Restricciones de Cupones

| Regla | Descripción |
|-------|-------------|
| Un cupón por venta | Solo se puede aplicar un cupón |
| No combinable con promo | Según configuración de la promoción |
| Monto mínimo | Cupón puede requerir compra mínima |
| Primera compra | Cupón puede ser solo para nuevos clientes |

### 7.3 Auditoría de Descuentos

```
Cada descuento aplicado genera registro:

DiscountAudit
├── sale_id: UUID
├── discount_type: enum (MANUAL, PROMOTION, COUPON)
├── source_id: UUID (promotion_id o coupon_id)
├── amount: decimal
├── applied_by: UUID (user_id)
├── reason: string (para manuales)
├── approved_by: UUID (si requiere aprobación)
└── created_at: timestamp
```

---

## 8. Métricas y Reportes

### 8.1 Efectividad de Promociones

```sql
SELECT 
    p.code,
    p.name,
    COUNT(DISTINCT s.id) as sales_with_promo,
    SUM(s.discount_amount) as total_discount_given,
    SUM(s.total) as total_revenue,
    AVG(s.total) as avg_ticket
FROM promotions p
JOIN sales s ON s.metadata->>'applied_promotions' LIKE '%' || p.id || '%'
WHERE p.company_id = :company_id
  AND s.status = 'COMPLETED'
  AND s.completed_at >= p.start_date
GROUP BY p.id, p.code, p.name
ORDER BY total_revenue DESC
```

### 8.2 Uso de Cupones

```sql
SELECT 
    c.code,
    p.name as promotion_name,
    c.max_uses,
    c.current_uses,
    ROUND(c.current_uses::decimal / NULLIF(c.max_uses, 0) * 100, 2) as usage_rate,
    SUM(cu.discount_amount) as total_discount
FROM coupons c
JOIN promotions p ON p.id = c.promotion_id
LEFT JOIN coupon_usages cu ON cu.coupon_id = c.id
WHERE c.company_id = :company_id
GROUP BY c.id, c.code, p.name, c.max_uses, c.current_uses
ORDER BY current_uses DESC
```

### 8.3 Productos Más Promocionados

```sql
SELECT 
    pv.sku,
    pv.name,
    COUNT(*) as times_discounted,
    SUM(sl.discount_amount) as total_discount,
    SUM(sl.quantity) as total_quantity
FROM sale_lines sl
JOIN product_variants pv ON pv.id = sl.product_variant_id
WHERE sl.discount_amount > 0
  AND sl.sale_id IN (
      SELECT id FROM sales 
      WHERE company_id = :company_id 
      AND completed_at >= :start_date
  )
GROUP BY pv.id, pv.sku, pv.name
ORDER BY total_discount DESC
LIMIT 20
```

---

## 9. Configuración del Sistema

### 9.1 Parámetros Globales

```
CompanySettings.promotions: {
    max_discount_percent: 50,
    allow_manual_discounts: true,
    manual_discount_requires_approval: true,
    manual_discount_approval_threshold: 10,
    allow_stacking: false,
    coupon_case_sensitive: false
}
```

### 9.2 Permisos por Rol

| Acción | Cajero | Supervisor | Admin |
|--------|--------|------------|-------|
| Aplicar promoción automática | ✅ | ✅ | ✅ |
| Aplicar cupón | ✅ | ✅ | ✅ |
| Descuento manual ≤ 10% | ✅ | ✅ | ✅ |
| Descuento manual > 10% | ❌ | ✅ | ✅ |
| Crear promoción | ❌ | ❌ | ✅ |
| Crear cupones | ❌ | ✅ | ✅ |

---

📌 **Las promociones y descuentos son herramientas de marketing que deben monitorearse para medir su impacto en ventas y márgenes.**
