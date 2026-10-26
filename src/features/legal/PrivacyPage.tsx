import { LegalPage } from './LegalPage'

/** Política de privacidad (U-4), from docs/spec.md §6. Draft, not legally reviewed. */
export function PrivacyPage() {
  return (
    <LegalPage title="Política de privacidad">
      <section>
        <h2>Qué es Porción</h2>
        <p>
          Porción es una app para registrar lo que comes, tus calorías y macros, y seguir tu peso.
          Algunos de esos datos, como tu peso, tu objetivo y tu alimentación, pueden considerarse
          datos de salud. Por eso te pedimos tu consentimiento explícito antes de guardarlos y solo
          pedimos lo necesario para que la app funcione.
        </p>
        <p>
          Responsable de los datos: <strong>[nombre del responsable, por definir]</strong>.
          Contacto: <strong>[correo de contacto, por definir]</strong>.
        </p>
      </section>

      <section>
        <h2>Qué datos guardamos</h2>
        <ul>
          <li>
            <strong>Tu cuenta:</strong> tu correo y tu contraseña (cifrada), o tu identificador de
            Google si ingresas con Google.
          </li>
          <li>
            <strong>Tu perfil:</strong> sexo para el cálculo, fecha de nacimiento, estatura, nivel
            de actividad, objetivo, meta diaria, macros y zona horaria.
          </li>
          <li>
            <strong>Tu consentimiento:</strong> la versión de esta política que aceptaste y la
            fecha.
          </li>
          <li>
            <strong>Tu uso de la app:</strong> tus pesos, lo que registras en cada comida, tus
            favoritos, tus listas de compras y los reportes de errores que envías.
          </li>
          <li>
            <strong>Los alimentos que creas:</strong> quedan en la base compartida para que todos
            los usen. Nadie más ve que los creaste tú.
          </li>
        </ul>
        <p>
          No pedimos RUT, teléfono ni dirección. Tu fecha de nacimiento solo se usa para calcular tu
          edad y no se muestra a nadie.
        </p>
      </section>

      <section>
        <h2>En tu teléfono</h2>
        <p>
          Para que puedas abrir la app sin conexión, tu navegador guarda una copia de tu perfil, tu
          día y tus alimentos recientes y favoritos. Solo la ve tu cuenta y se borra al cerrar
          sesión.
        </p>
      </section>

      <section>
        <h2>Para qué los usamos</h2>
        <p>
          Solo para que la app funcione: calcular tu meta, mostrarte tu día y tu progreso, y guardar
          tus listas. No vendemos tus datos, no mostramos publicidad y no usamos analítica ni
          rastreadores.
        </p>
      </section>

      <section>
        <h2>Con quién se comparten</h2>
        <ul>
          <li>
            <strong>Supabase</strong> aloja la base de datos y las cuentas. Región:{' '}
            <strong>[por definir al desplegar]</strong>.
          </li>
          <li>
            <strong>Google</strong>, solo si eliges ingresar con tu cuenta de Google.
          </li>
          <li>
            <strong>Open Food Facts</strong> recibe el código de barras que escaneas, para buscar el
            producto. No recibe tu nombre, tu correo ni tus registros.
          </li>
        </ul>
      </section>

      <section>
        <h2>Tus derechos</h2>
        <p>Desde Perfil puedes ejercer tus derechos sin pedírselo a nadie:</p>
        <ul>
          <li>
            <strong>Acceso y portabilidad:</strong> descarga una copia de todos tus datos en JSON.
          </li>
          <li>
            <strong>Rectificación:</strong> edita tus datos y tus metas cuando quieras.
          </li>
          <li>
            <strong>Supresión:</strong> elimina tu cuenta. Se borran tu perfil, tus registros, tus
            pesos, tus favoritos y tus listas. Los alimentos que creaste se quedan en la base, sin
            autor.
          </li>
        </ul>
        <p>
          Para cualquier otra solicitud, como oponerte a un tratamiento, escríbenos al correo de
          contacto. En Chile también puedes reclamar ante la autoridad de protección de datos
          personales (Ley 21.719).
        </p>
      </section>

      <section>
        <h2>Cuánto tiempo los guardamos</h2>
        <p>
          Mientras tengas tu cuenta. Al eliminarla, tus datos se borran de inmediato. Las copias de
          respaldo del proveedor pueden conservarlos por un tiempo limitado hasta que se renuevan.
        </p>
      </section>

      <section>
        <h2>Edad mínima</h2>
        <p>Porción es solo para personas mayores de 18 años.</p>
      </section>

      <section>
        <h2>Cambios a esta política</h2>
        <p>
          Si la cambiamos, publicaremos una versión nueva y te pediremos aceptarla de nuevo antes de
          seguir usando la app.
        </p>
      </section>
    </LegalPage>
  )
}
