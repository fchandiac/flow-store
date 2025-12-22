# Documentación de Auditoría - ElectNextStart

## Métodos con Auditoría Correcta

### 1. **Server Actions - Auditoría Manual (Recomendado)**
✅ **Captura userId del usuario actual**

#### User (en `/app/actions/users.ts`):
- **`createUserWithPerson()`** - ✅ CREATE con userId
  - Captura: id, userName, mail, phone, rol
  - userId: Se obtiene de `getServerSession(authOptions)`
  - Cambios: Se comparan oldValues vs newValues

- **`updateUserWithPerson()`** - ✅ UPDATE con userId
  - Captura valores antiguos ANTES de la modificación
  - userId: Se obtiene de `getServerSession(authOptions)`
  - Cambios: oldValues vs newValues se comparan correctamente
  - **NOTA**: Actualizar rol genera audit correctamente desde v1.3

### 2. **TypeORM Subscribers - Auditoría Automática (Sin userId)**
⚠️ **NO captura userId del usuario actual**

#### AuditSubscriber (en `/data/subscribers/AuditSubscriber.ts`):
- **`afterInsert()`** - Captura CREATE automático (userId = undefined)
- **`afterUpdate()`** - Captura UPDATE automático (userId = undefined)
- **`afterRemove()`** - Captura DELETE automático (userId = undefined)

**Entidades auditadas automáticamente:**
- User (Create/Update/Delete directo en DB)
- Person (Create/Update/Delete directo en DB)

**Limitación**: El subscriber se ejecuta en el contexto de TypeORM y no tiene acceso a la sesión HTTP, por lo que userId siempre es `undefined`.

---

## Resumen de Cobertura

### ✅ Con userId (Recomendado)
```
LOGIN_SUCCESS
LOGIN_FAILED (con detalles de razón)
LOGOUT
CREATE User (vía updateUserWithPerson)
UPDATE User (vía updateUserWithPerson) 
CREATE User (vía createUserWithPerson)
```

### ⚠️ Sin userId (Automático)
```
CREATE User/Person (directo en DB)
UPDATE User/Person (directo en DB)
DELETE User/Person (directo en DB)
```

---

## Recomendaciones

### Para Auditoría con userId:
1. **Siempre usar server actions** (`createUserWithPerson`, `updateUserWithPerson`)
2. Estos métodos llaman a `logUserAudit()` que:
   - Obtiene el userId de `getServerSession(authOptions)`
   - Compara oldValues vs newValues
   - Genera registros detallados con usuario actual

### Para Auditoría Automática:
1. El `AuditSubscriber` captura operaciones directas de BD
2. Útil para detectar cambios no autorizados
3. **No tiene userId** - se puede mejorar inyectando contexto HTTP

---

## Cómo Agregar Auditoría a un Nuevo Método

### Opción 1: Con userId (Recomendado)
```typescript
// En server action
async function myAction(input: MyInput) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  
  // ... hacer cambios ...
  
  await logUserAudit(db, entityId, AuditActionType.UPDATE, oldValues, newValues);
}
```

### Opción 2: Automático via Subscriber
```typescript
// El AuditSubscriber se ejecuta automáticamente
// Solo necesitas usar las entidades User/Person
```

---

## Testing
Para verificar que la auditoría funciona correctamente:

1. **Crear usuario**: `POST /home/users` → Debe generar CREATE audit con userId
2. **Actualizar usuario**: `PUT /home/users/{id}` → Debe generar UPDATE audit con userId y oldValues correctos
3. **Cambiar rol**: Mediante UpdateUserDialog → Debe generar UPDATE audit con rol anterior/nuevo
4. **Login**: Debe generar LOGIN_SUCCESS/LOGIN_FAILED con userId (si existe)

---

## Problemas Conocidos y Solucionados

✅ **RESUELTO**: userId undefined en user update
- Causa: Se guardaban valores DESPUÉS de modificar
- Solución: Guardar oldValues ANTES de modificar el objeto

✅ **RESUELTO**: ECONNRESET en auditoría concurrente
- Causa: connectionLimit too low (10)
- Solución: Aumentado a 20 + mejorado manejo de errores

⚠️ **ABIERTO**: AuditSubscriber no tiene acceso a userId
- Causa: Subscribers de TypeORM no tienen contexto HTTP
- Posible solución: Inyectar userId mediante context/middleware
