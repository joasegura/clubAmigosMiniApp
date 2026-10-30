import { useNavigate } from 'react-router-dom'
import { IconBack } from '../components/Icons'

// Texto modelo: la vinoteca tiene que completar sus datos y validarlo con su asesor legal antes del lanzamiento.
const TERMS: [string, string][] = [
  ['Quiénes pueden usar el club', 'El Club Entre amigos es para personas mayores de 18 años. Al ingresar declarás que cumplís con esa edad.'],
  [
    'Qué podés publicar',
    'Podés subir los vinos que tomás, con puntaje, comentario y foto. Lo que publiques tiene que ser tuyo, respetuoso y relacionado con el vino. No se permite contenido ofensivo, publicidad de terceros ni fotos de otras personas sin su permiso.',
  ],
  [
    'Moderación',
    'La vinoteca puede ocultar publicaciones o comentarios que no cumplan estas reglas, y suspender el acceso de quien las incumpla de forma repetida. Cualquier socio puede reportar contenido desde el menú de cada publicación.',
  ],
  [
    'Precios, stock y pedidos',
    'Los precios y el stock que se muestran son informativos y pueden cambiar sin aviso. El botón "Lo quiero" abre una conversación por WhatsApp con la vinoteca: no es una compra ni una reserva confirmada hasta que la vinoteca la confirme.',
  ],
  ['Uso de tus publicaciones', 'Al publicar, autorizás a la vinoteca a mostrar tu publicación dentro del club. Podés borrarla cuando quieras desde tu perfil o desde la publicación.'],
  ['Consumo responsable', 'Beber con moderación. Prohibida su venta a menores de 18 años (Ley 24.788).'],
  ['Cambios', 'Si cambiamos estos términos, lo vamos a avisar dentro de la app.'],
]

const PRIVACY: [string, string][] = [
  ['Responsable', 'Vinoteca Entre amigos [razón social, CUIT, domicilio y mail de contacto a completar] es responsable de los datos que se cargan en el club.'],
  [
    'Qué datos guardamos',
    'Tu nombre, tu mail y, si entrás con Google, tu foto de perfil. También lo que publicás (vinos, puntajes, comentarios, fotos), tu lista "Quiero probar" y los toques en "Lo quiero".',
  ],
  [
    'Para qué los usamos',
    'Para que funcione el club (mostrar tus publicaciones, armar el ranking), para responder tus pedidos y para conocer qué vinos interesan a los socios. No vendemos ni cedemos tus datos a terceros.',
  ],
  ['Quién los ve', 'Los demás socios ven tu nombre, tu foto y lo que publicás. Tu mail y tu lista "Quiero probar" son privados.'],
  [
    'Tus derechos',
    'Podés pedir acceder, corregir o borrar tus datos escribiendo a [mail de contacto]. La Agencia de Acceso a la Información Pública, órgano de control de la Ley 25.326, atiende las denuncias y reclamos por incumplimiento de las normas de protección de datos personales.',
  ],
  ['Cuánto tiempo', 'Guardamos tus datos mientras seas socio del club. Si pedís la baja, los borramos.'],
]

export default function Legal({ kind }: { kind: 'terminos' | 'privacidad' }) {
  const navigate = useNavigate()
  const title = kind === 'terminos' ? 'Términos del club' : 'Política de privacidad'
  const sections = kind === 'terminos' ? TERMS : PRIVACY
  return (
    <div className="mx-auto min-h-full max-w-md bg-white">
      <header className="sticky top-0 flex items-center gap-2 border-b border-linea bg-white/95 px-3 py-2 backdrop-blur">
        <button
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
          aria-label="Volver"
          className="flex h-11 w-11 items-center justify-center"
        >
          <IconBack size={20} />
        </button>
        <h1 className="text-[19px] font-medium">{title}</h1>
      </header>
      <div className="flex flex-col gap-5 px-5 py-6">
        {sections.map(([h, body]) => (
          <section key={h}>
            <h2 className="text-base font-medium">{h}</h2>
            <p className="mt-1 text-sm leading-relaxed text-texto">{body}</p>
          </section>
        ))}
        <p className="rounded-xl bg-crema p-3 text-xs text-gris">Texto modelo: la vinoteca tiene que completar sus datos y validarlo antes del lanzamiento.</p>
      </div>
    </div>
  )
}
