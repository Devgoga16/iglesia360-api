# API para Cambiar Estado de Solicitudes Financieras

## Endpoint
`PATCH /api/financial-requests/:id/status`

Cambia el estado de una solicitud financiera específica. Requiere autenticación con token JWT.

## Parámetros de URL
- `id` (string, requerido): ID de la solicitud financiera a actualizar.

## Request Body
El body debe ser un objeto JSON con los siguientes campos:

- `status` (string, requerido): Nuevo estado de la solicitud. Valores permitidos: `APPROVED_NETWORK`, `APPROVED_LEAD`, `APPROVED_ADMIN`, `MONEY_DELIVERED`, `EXPENSES_SUBMITTED`, `REMAINDER_REFUNDED`, `CLOSED`, `REJECTED`.
- `evidenceUrls` (array de strings, opcional/requerido): URLs de evidencia (requerido para `MONEY_DELIVERED`, `EXPENSES_SUBMITTED`, `REMAINDER_REFUNDED`).
- `rejectionReason` (string, requerido si `status` es `REJECTED`): Motivo del rechazo.
- `metadata` (object, opcional): Información adicional.
- `remainderAmount` (number, requerido si `status` es `REMAINDER_REFUNDED`): Monto remanente devuelto.

## Responses
- `200`: Estado cambiado exitosamente. Retorna la solicitud actualizada.
- `400`: Error en la solicitud (transición inválida, campos faltantes, etc.).
- `403`: No tiene permisos para cambiar el estado.
- `404`: Solicitud no encontrada.

## Estados Finales
Los estados `CLOSED` y `REJECTED` son finales y no permiten transiciones adicionales.

## Detalles por Estado Actual

### 1. Desde `CREATED`
**Transiciones permitidas**: `APPROVED_NETWORK`, `REJECTED`

#### A `APPROVED_NETWORK`
- **Permisos**: Rol `PASTOR` o `ADMINISTRADOR` (solo si la solicitud pertenece a su sucursal).
- **Body**:
  ```json
  {
    "status": "APPROVED_NETWORK"
  }
  ```

#### A `REJECTED`
- **Permisos**: Rol `PASTOR` o `ADMINISTRADOR` (solo si la solicitud pertenece a su sucursal).
- **Body**:
  ```json
  {
    "status": "REJECTED",
    "rejectionReason": "Motivo del rechazo"
  }
  ```

### 2. Desde `APPROVED_NETWORK`
**Transiciones permitidas**: `APPROVED_LEAD` (si requiere aprobación del pastor titular), `APPROVED_ADMIN` (si no requiere), `REJECTED`

#### A `APPROVED_LEAD` (solo si `requiresLeadApproval` es true)
- **Permisos**: Rol `PASTOR PRINCIPAL` o `ADMINISTRADOR`.
- **Body**:
  ```json
  {
    "status": "APPROVED_LEAD"
  }
  ```

#### A `APPROVED_ADMIN` (solo si `requiresLeadApproval` es false)
- **Permisos**: Rol `ADMINISTRADOR`.
- **Body**:
  ```json
  {
    "status": "APPROVED_ADMIN"
  }
  ```

#### A `REJECTED`
- **Permisos**: Rol `PASTOR PRINCIPAL` (si requiere lead), `ADMINISTRADOR` (si no requiere), o `PASTOR`/`ADMINISTRADOR` de la sucursal.
- **Body**:
  ```json
  {
    "status": "REJECTED",
    "rejectionReason": "Motivo del rechazo"
  }
  ```

### 3. Desde `APPROVED_LEAD`
**Transiciones permitidas**: `APPROVED_ADMIN`, `REJECTED`

#### A `APPROVED_ADMIN`
- **Permisos**: Rol `ADMINISTRADOR`.
- **Body**:
  ```json
  {
    "status": "APPROVED_ADMIN"
  }
  ```

#### A `REJECTED`
- **Permisos**: Rol `ADMINISTRADOR`.
- **Body**:
  ```json
  {
    "status": "REJECTED",
    "rejectionReason": "Motivo del rechazo"
  }
  ```

### 4. Desde `APPROVED_ADMIN`
**Transiciones permitidas**: `MONEY_DELIVERED`, `REJECTED`

#### A `MONEY_DELIVERED`
- **Permisos**: Rol `ADMINISTRADOR`.
- **Body**:
  ```json
  {
    "status": "MONEY_DELIVERED",
    "evidenceUrls": ["https://ejemplo.com/evidencia1.jpg", "https://ejemplo.com/evidencia2.pdf"]
  }
  ```

#### A `REJECTED`
- **Permisos**: Rol `ADMINISTRADOR`.
- **Body**:
  ```json
  {
    "status": "REJECTED",
    "rejectionReason": "Motivo del rechazo"
  }
  ```

### 5. Desde `MONEY_DELIVERED`
**Transiciones permitidas**: `EXPENSES_SUBMITTED`, `REMAINDER_REFUNDED`, `CLOSED`, `REJECTED`

#### A `EXPENSES_SUBMITTED`
- **Permisos**: Solo el solicitante.
- **Body**:
  ```json
  {
    "status": "EXPENSES_SUBMITTED",
    "evidenceUrls": ["https://ejemplo.com/comprobante1.jpg"]
  }
  ```

#### A `REMAINDER_REFUNDED`
- **Permisos**: Solicitante o `ADMINISTRADOR`.
- **Body**:
  ```json
  {
    "status": "REMAINDER_REFUNDED",
    "evidenceUrls": ["https://ejemplo.com/remanente.jpg"],
    "remainderAmount": 50.00
  }
  ```

#### A `CLOSED`
- **Permisos**: Rol `ADMINISTRADOR`.
- **Body**:
  ```json
  {
    "status": "CLOSED"
  }
  ```

#### A `REJECTED`
- **Permisos**: Rol `ADMINISTRADOR`.
- **Body**:
  ```json
  {
    "status": "REJECTED",
    "rejectionReason": "Motivo del rechazo"
  }
  ```

### 6. Desde `EXPENSES_SUBMITTED`
**Transiciones permitidas**: `REMAINDER_REFUNDED`, `CLOSED`, `REJECTED`

#### A `REMAINDER_REFUNDED`
- **Permisos**: Solicitante o `ADMINISTRADOR`.
- **Body**:
  ```json
  {
    "status": "REMAINDER_REFUNDED",
    "evidenceUrls": ["https://ejemplo.com/remanente.jpg"],
    "remainderAmount": 25.50
  }
  ```

#### A `CLOSED`
- **Permisos**: Rol `ADMINISTRADOR`.
- **Body**:
  ```json
  {
    "status": "CLOSED"
  }
  ```

#### A `REJECTED`
- **Permisos**: Rol `ADMINISTRADOR`.
- **Body**:
  ```json
  {
    "status": "REJECTED",
    "rejectionReason": "Motivo del rechazo"
  }
  ```

### 7. Desde `REMAINDER_REFUNDED`
**Transiciones permitidas**: `CLOSED`, `REJECTED`

#### A `CLOSED`
- **Permisos**: Rol `ADMINISTRADOR`.
- **Body**:
  ```json
  {
    "status": "CLOSED"
  }
  ```

#### A `REJECTED`
- **Permisos**: Rol `ADMINISTRADOR`.
- **Body**:
  ```json
  {
    "status": "REJECTED",
    "rejectionReason": "Motivo del rechazo"
  }
  ```

## Notas Adicionales
- El historial de cambios (`statusHistory`) registra cada transición, incluyendo quién la realizó, fecha, motivo de rechazo (si aplica), evidencias y metadata.
- Las transiciones se validan contra reglas de negocio (ej. montos altos requieren aprobación adicional).
- Si intentas una transición inválida, recibirás un error 400.</content>
<parameter name="filePath">c:\Users\caleb\8 - PROYECTOS\UNIFY\iglesia360-api\FINANCIAL_REQUEST_STATUS_API.md