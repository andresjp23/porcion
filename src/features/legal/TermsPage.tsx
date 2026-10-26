import { Link } from 'react-router'
import { linkOnBone } from '@/features/auth/styles'
import { LegalPage } from './LegalPage'

/** Términos (U-4). Draft, not legally reviewed. */
export function TermsPage() {
  return (
    <LegalPage title="Términos">
      <section>
        <h2>Uso de la app</h2>
        <p>
          Porción te ayuda a registrar lo que comes y a seguir tu peso. Para usarla debes ser mayor
          de 18 años, aceptar estos Términos y la{' '}
          <Link to="/privacy" className={linkOnBone}>
            Política de privacidad
          </Link>
          , y cuidar el acceso a tu cuenta.
        </p>
      </section>

      <section>
        <h2>No es consejo médico</h2>
        <p>
          La meta diaria y los macros son <strong>estimaciones</strong> hechas con fórmulas
          generales (Mifflin-St Jeor). No reemplazan la indicación de un profesional de la salud.
        </p>
        <p>
          Consulta a un profesional antes de cambiar tu alimentación si cursas un embarazo o estás
          en período de lactancia, tienes una enfermedad crónica o tienes o tuviste un trastorno de
          la conducta alimentaria.
        </p>
      </section>

      <section>
        <h2>La base de alimentos</h2>
        <p>
          Los datos nutricionales vienen de fuentes públicas (USDA FoodData Central; FAO y
          Ministerio de Salud de Chile 2010), de Open Food Facts y de aportes de la comunidad.
          Intentamos que sean correctos, pero pueden tener errores: revisa la etiqueta cuando puedas
          y repórtalos desde el detalle del alimento.
        </p>
        <p>
          Los productos importados de Open Food Facts se usan bajo la licencia Open Database License
          (ODbL).
        </p>
      </section>

      <section>
        <h2>Lo que aportas</h2>
        <p>
          Cuando creas un alimento, lo compartes con todas las personas que usan Porción y nos
          permites guardarlo, mostrarlo y corregirlo. Se conserva aunque elimines tu cuenta, sin tu
          nombre.
        </p>
        <p>
          Aporta solo datos que sean reales, tomados de la etiqueta o de una fuente confiable, y no
          escribas datos personales en el nombre ni en la marca.
        </p>
      </section>

      <section>
        <h2>Disponibilidad</h2>
        <p>
          Porción es un proyecto personal y se ofrece tal como está, sin garantías de que funcione
          siempre ni sin errores. Podemos cambiarla o dejar de ofrecerla; si eso pasa, te avisaremos
          para que puedas descargar tus datos.
        </p>
      </section>

      <section>
        <h2>Tu cuenta</h2>
        <p>
          Puedes eliminar tu cuenta cuando quieras desde Perfil. Podemos suspender una cuenta que se
          use para dañar la app o a otras personas, por ejemplo con aportes falsos a propósito.
        </p>
      </section>

      <section>
        <h2>Cambios y ley aplicable</h2>
        <p>
          Si cambiamos estos Términos, te pediremos aceptarlos de nuevo. Se rigen por las leyes de
          Chile.
        </p>
      </section>
    </LegalPage>
  )
}
