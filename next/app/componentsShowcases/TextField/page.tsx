'use client';

import React, { useState } from 'react';
import { TextField } from '@/app/baseComponents/TextField/TextField';

export default function TextFieldShowcase() {
  const [basicText, setBasicText] = useState('');
  const [emailText, setEmailText] = useState('');
  const [passwordText, setPasswordText] = useState('');
  const [dniText, setDniText] = useState('');
  const [currencyUSD, setCurrencyUSD] = useState('');
  const [currencyEUR, setCurrencyEUR] = useState('');
  const [currencyGBP, setCurrencyGBP] = useState('');
  const [currencyJPY, setCurrencyJPY] = useState('');
  const [currencyBTC, setCurrencyBTC] = useState('');
  const [textareaText, setTextareaText] = useState('');
  const [phoneText, setPhoneText] = useState('');
  const [phoneCL, setPhoneCL] = useState('+56');
  const [disabledText, setDisabledText] = useState('Campo deshabilitado');

  // Función para formatear valores para mostrar
  const formatDisplayValue = (value: string, symbol: string) => {
    if (!value) return '';
    const num = parseInt(value);
    return `${symbol} ${num.toLocaleString('es-CL')}`;
  };

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--color-primary)' }}>
            TextField Component
          </h1>
          <p style={{ color: 'var(--color-muted)' }}>
            Campo de texto versátil con soporte para múltiples tipos y validaciones
          </p>
        </div>

        {/* Main Showcase */}
        <div className="bg-white rounded-lg border border-gray-300 p-8 mb-8">
          <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Ejemplos de Uso
          </h2>

          <div className="space-y-6">
            {/* Basic Text Input */}
            <div>
              <TextField
                label="Nombre"
                value={basicText}
                onChange={(e) => setBasicText(e.target.value)}
                placeholder="Ingresa tu nombre"
                startIcon="person"
              />
              {basicText && (
                <p className="mt-2 text-sm" style={{ color: 'var(--color-secondary)' }}>
                  Valor: {basicText}
                </p>
              )}
            </div>

            {/* Email Input */}
            <div>
              <TextField
                label="Correo Electrónico"
                type="email"
                value={emailText}
                onChange={(e) => setEmailText(e.target.value)}
                placeholder="tu@email.com"
                startIcon="mail"
              />
              {emailText && (
                <p className="mt-2 text-sm" style={{ color: 'var(--color-secondary)' }}>
                  Email: {emailText}
                </p>
              )}
            </div>

            {/* Password Input */}
            <div>
              <TextField
                label="Contraseña"
                type="password"
                value={passwordText}
                onChange={(e) => setPasswordText(e.target.value)}
                placeholder="Ingresa tu contraseña"
                startIcon="lock"
              />
              {passwordText && (
                <p className="mt-2 text-sm" style={{ color: 'var(--color-secondary)' }}>
                  Contraseña ingresada (caracteres: {passwordText.length})
                </p>
              )}
            </div>

            {/* DNI Input */}
            <div>
              <TextField
                label="RUT/DNI"
                type="dni"
                value={dniText}
                onChange={(e) => setDniText(e.target.value)}
                placeholder="12.345.678-9"
                startIcon="badge"
                required={true}
              />
              {dniText && (
                <p className="mt-2 text-sm" style={{ color: 'var(--color-secondary)' }}>
                  DNI: {dniText}
                </p>
              )}
            </div>

            {/* Currency Input - USD */}
            <div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <TextField
                    label="USD (Dólares)"
                    type="currency"
                    value={currencyUSD}
                    onChange={(e) => setCurrencyUSD(e.target.value)}
                    placeholder="0"
                    startIcon="attach_money"
                    currencySymbol="$"
                  />
                  {currencyUSD && (
                    <p className="mt-2 text-sm" style={{ color: 'var(--color-secondary)' }}>
                      Valor: {formatDisplayValue(currencyUSD, 'USD')}
                    </p>
                  )}
                </div>
                <div className="flex-1">
                  <TextField
                    label="EUR (Euros)"
                    type="currency"
                    value={currencyEUR}
                    onChange={(e) => setCurrencyEUR(e.target.value)}
                    placeholder="0"
                    startIcon="attach_money"
                    currencySymbol="€"
                  />
                  {currencyEUR && (
                    <p className="mt-2 text-sm" style={{ color: 'var(--color-secondary)' }}>
                      Valor: {formatDisplayValue(currencyEUR, 'EUR')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Currency Input - GBP & JPY */}
            <div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <TextField
                    label="GBP (Libras)"
                    type="currency"
                    value={currencyGBP}
                    onChange={(e) => setCurrencyGBP(e.target.value)}
                    placeholder="0"
                    startIcon="attach_money"
                    currencySymbol="£"
                  />
                  {currencyGBP && (
                    <p className="mt-2 text-sm" style={{ color: 'var(--color-secondary)' }}>
                      Valor: {formatDisplayValue(currencyGBP, 'GBP')}
                    </p>
                  )}
                </div>
                <div className="flex-1">
                  <TextField
                    label="JPY (Yenes)"
                    type="currency"
                    value={currencyJPY}
                    onChange={(e) => setCurrencyJPY(e.target.value)}
                    placeholder="0"
                    startIcon="attach_money"
                    currencySymbol="¥"
                  />
                  {currencyJPY && (
                    <p className="mt-2 text-sm" style={{ color: 'var(--color-secondary)' }}>
                      Valor: {formatDisplayValue(currencyJPY, 'JPY')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Currency Input - BTC */}
            <div>
              <TextField
                label="BTC (Bitcoin)"
                type="currency"
                value={currencyBTC}
                onChange={(e) => setCurrencyBTC(e.target.value)}
                placeholder="0"
                startIcon="attach_money"
                currencySymbol="₿"
              />
              {currencyBTC && (
                <p className="mt-2 text-sm" style={{ color: 'var(--color-secondary)' }}>
                  Valor: {formatDisplayValue(currencyBTC, 'BTC')}
                </p>
              )}
            </div>

            {/* Phone Input - Chile (+56) con formateo visual */}
            <div>
              <TextField
                label="Teléfono Chile"
                type="tel"
                value={phoneCL}
                onChange={(e) => setPhoneCL(e.target.value)}
                placeholder="+56 890 890 890"
                startIcon="phone"
                phonePrefix="+56"
                allowLetters={false}
              />
              {phoneCL && (
                <p className="mt-2 text-sm" style={{ color: 'var(--color-secondary)' }}>
                  Valor interno: {phoneCL}
                </p>
              )}
            </div>
            {/* Phone Input - internacional, permite letras */}
            <div>
              <TextField
                label="Teléfono internacional (permite letras)"
                type="tel"
                value={phoneText}
                onChange={(e) => setPhoneText(e.target.value)}
                placeholder="+1 ABC 123 456"
                startIcon="phone"
                phonePrefix="+1"
                allowLetters={true}
              />
              {phoneText && (
                <p className="mt-2 text-sm" style={{ color: 'var(--color-secondary)' }}>
                  Valor interno: {phoneText}
                </p>
              )}
            </div>

            {/* Textarea Input */}
            <div>
              <TextField
                label="Descripción"
                type="textarea"
                value={textareaText}
                onChange={(e) => setTextareaText(e.target.value)}
                placeholder="Escribe una descripción..."
                rows={4}
              />
              {textareaText && (
                <p className="mt-2 text-sm" style={{ color: 'var(--color-secondary)' }}>
                  Caracteres: {textareaText.length}
                </p>
              )}
            </div>

            {/* Disabled Input */}
            <div>
              <TextField
                label="Campo Deshabilitado"
                value={disabledText}
                onChange={(e) => setDisabledText(e.target.value)}
                disabled={true}
              />
            </div>

            {/* Required Input */}
            <div>
              <TextField
                label="Campo Requerido"
                value=""
                onChange={() => {}}
                placeholder="Este campo es obligatorio"
                required={true}
                startIcon="asterisk"
              />
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--color-secondary)', color: 'var(--color-background)' }}>
            <h3 className="font-semibold mb-3">Características</h3>
            <ul className="text-sm space-y-2">
              <li>✓ Múltiples tipos (text, email, password, etc)</li>
              <li>✓ Iconos de inicio y fin</li>
              <li>✓ Validación de DNI chileno</li>
              <li>✓ Formato de moneda automático</li>
              <li>✓ Soporte para símbolos: $ € £ ¥ ₿</li>
              <li>✓ Campo de texto multilinea (textarea)</li>
              <li>✓ Toggle de visibilidad para contraseña</li>
            </ul>
          </div>

          <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-background)' }}>
            <h3 className="font-semibold mb-3">Currency: Cómo funciona</h3>
            <ul className="text-sm space-y-2">
              <li><strong>Símbolo configurable:</strong> currencySymbol prop</li>
              <li><strong>Valor interno:</strong> Solo números (ej: 1234567)</li>
              <li><strong>Visualización:</strong> $ 1,234,567 con separadores</li>
              <li><strong>Formato:</strong> Locale es-CL (miles con punto)</li>
              <li><strong>onChange devuelve:</strong> Solo números sin símbolo</li>
            </ul>
          </div>
        </div>

        {/* Usage Examples */}
        <div className="bg-white rounded-lg border border-gray-300 p-8 mb-8">
          <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Ejemplos de Uso
          </h2>

          <div className="space-y-8">
            <div>
              <h3 className="font-semibold mb-3">Uso Básico</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`import { useState } from 'react';
import TextField from '@/app/baseComponents/TextField/TextField';

function MyComponent() {
  const [value, setValue] = useState('');

  return (
    <TextField
      label="Nombre completo"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder="Ingresa tu nombre"
    />
  );
}`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Importación básica y uso simple del componente TextField con label y placeholder.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Tipos de Input Especiales</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`// Email con validación automática
<TextField
  label="Correo electrónico"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  placeholder="tu@email.com"
/>

// Teléfono con formato
<TextField
  label="Teléfono"
  type="tel"
  value={phone}
  onChange={(e) => setPhone(e.target.value)}
  placeholder="+56 9 1234 5678"
  phonePrefix="+56"
/>

// Número con restricciones
<TextField
  label="Edad"
  type="number"
  value={age}
  onChange={(e) => setAge(e.target.value)}
  min="18"
  max="100"
/>

// Contraseña con toggle de visibilidad
<TextField
  label="Contraseña"
  type="password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  placeholder="Mínimo 8 caracteres"
/>`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                TextField soporta todos los tipos HTML5 estándar con validaciones y comportamientos específicos.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Campos de Moneda</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`<TextField
  label="Monto en USD"
  type="currency"
  value={usdValue}           // Valor interno: "1234567"
  onChange={(e) => setUsdValue(e.target.value)}
  currencySymbol="$"         // Muestra: $ 1,234,567
  placeholder="0"
/>

// Monedas disponibles
<TextField type="currency" currencySymbol="$" label="USD" />
<TextField type="currency" currencySymbol="€" label="EUR" />
<TextField type="currency" currencySymbol="£" label="GBP" />
<TextField type="currency" currencySymbol="¥" label="JPY" />
<TextField type="currency" currencySymbol="₿" label="BTC" />

// El onChange siempre devuelve: "1234567" (solo números)
// La visualización en el input es: "$ 1,234,567"`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                <strong>Nota:</strong> El valor interno son solo números. El formato se aplica solo en la visualización.
                Esto facilita procesar el valor en el backend sin necesidad de parsing adicional.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Textarea para Texto Largo</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`<TextField
  label="Descripción del producto"
  type="textarea"
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  placeholder="Describe el producto en detalle..."
  rows={4}
  maxLength={500}
/>

// Con contador de caracteres
<p className="text-sm text-gray-500 mt-1">
  {description.length}/500 caracteres
</p>`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Para texto multilinea, usa <code>type="textarea"</code> con la prop <code>rows</code> para definir la altura inicial.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Validación de DNI Chileno</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`const [dni, setDni] = useState('');
const [isValid, setIsValid] = useState(true);

<TextField
  label="DNI (Chile)"
  type="dni"
  value={dni}
  onChange={(e) => {
    setDni(e.target.value);
    setIsValid(e.target.isValid); // Validación automática
  }}
  placeholder="12.345.678-9"
  required
/>

{!isValid && dni && (
  <p className="text-red-500 text-sm mt-1">
    DNI inválido
  </p>
)}`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Validación automática de RUT/DNI chileno con formato y verificación del dígito verificador.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Con Iconos</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`// Icono al inicio
<TextField
  label="Buscar"
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  placeholder="Buscar productos..."
  startIcon="search"
/>

// Icono al final
<TextField
  label="Usuario"
  value={username}
  onChange={(e) => setUsername(e.target.value)}
  placeholder="Nombre de usuario"
  endIcon="person"
/>

// Iconos en ambos lados
<TextField
  label="Contraseña"
  type="password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  startIcon="lock"
  endIcon="visibility"
/>`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Los iconos se pueden agregar al inicio (<code>startIcon</code>) o al final (<code>endIcon</code>) del campo.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Estados y Validación</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`// Campo requerido
<TextField
  label="Email requerido"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  required
/>

// Campo deshabilitado
<TextField
  label="Campo bloqueado"
  value="Valor fijo"
  disabled
/>

// Con validación personalizada
<TextField
  label="Código postal"
  value={zipCode}
  onChange={(e) => setZipCode(e.target.value)}
  pattern="[0-9]{5}"
  title="Código postal de 5 dígitos"
/>`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Estados disponibles: normal, requerido, deshabilitado, con validación HTML5 personalizada.
              </p>
            </div>
          </div>
        </div>

        {/* Wireframe */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Wireframe
          </h2>
          <div className="bg-white rounded-lg border border-gray-300 p-8">
            <div className="max-w-md mx-auto">
              <div className="space-y-4">
                {/* TextField wireframe */}
                <div className="relative flex items-center border border-gray-400 rounded-lg bg-gray-100 h-12">
                  {/* Input simulado */}
                  <div className="flex-1 h-full flex items-center pl-4 pr-4">
                    <div className="h-4 w-40 bg-gray-300 rounded" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <button
          onClick={() => window.history.back()}
          className="px-6 py-2 rounded-lg font-medium transition-all"
          style={{
            backgroundColor: 'var(--color-muted)',
            color: 'var(--color-background)',
          }}
        >
          ← Atrás
        </button>
      </div>
    </div>
  );
}
