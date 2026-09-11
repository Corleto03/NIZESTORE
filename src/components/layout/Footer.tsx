import Link from "next/link";
import { ShieldCheck, Truck, CreditCard, RotateCcw } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 mt-20">
      {/* Value props banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 border-b border-gray-100">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="flex items-center space-x-3">
            <Truck className="w-8 h-8 text-red-600 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-gray-900">Envío Gratis desde $35</h4>
              <p className="text-xs text-gray-500">A todo El Salvador en 48-72h</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <ShieldCheck className="w-8 h-8 text-red-600 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-gray-900">Mercancía 100% Oficial</h4>
              <p className="text-xs text-gray-500">Figuras y mangas importados</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <CreditCard className="w-8 h-8 text-red-600 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-gray-900">Pagos Seguros</h4>
              <p className="text-xs text-gray-500">Tarjetas, transferencia o contra entrega</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <RotateCcw className="w-8 h-8 text-red-600 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-gray-900">Garantía de Satisfacción</h4>
              <p className="text-xs text-gray-500">Soporte directo en San Salvador</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main footer navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <span className="text-xl font-extrabold text-red-600 tracking-tight">NizeStore</span>
            <p className="text-xs text-gray-500 leading-relaxed">
              La tienda de anime, manga y coleccionables líder en El Salvador. Proyecto universitario de Inteligencia de Negocios y Optimización de Embudo de Ventas.
            </p>
          </div>

          <div>
            <h5 className="text-xs font-bold uppercase text-gray-900 tracking-wider mb-3">Categorías</h5>
            <ul className="space-y-2 text-xs text-gray-600">
              <li><Link href="/?cat=Manga" className="hover:text-red-600 transition-colors">Manga</Link></li>
              <li><Link href="/?cat=Figuras" className="hover:text-red-600 transition-colors">Figuras Coleccionables</Link></li>
              <li><Link href="/?cat=Ropa" className="hover:text-red-600 transition-colors">Ropa y Accesorios</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="text-xs font-bold uppercase text-gray-900 tracking-wider mb-3">Franquicias</h5>
            <ul className="space-y-2 text-xs text-gray-600">
              <li><Link href="/?q=One+Piece" className="hover:text-red-600 transition-colors">One Piece</Link></li>
              <li><Link href="/?q=Jujutsu+Kaisen" className="hover:text-red-600 transition-colors">Jujutsu Kaisen</Link></li>
              <li><Link href="/" className="hover:text-red-600 transition-colors">Ver todas las franquicias</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="text-xs font-bold uppercase text-gray-900 tracking-wider mb-3">Sucursales & Retiro</h5>
            <p className="text-xs text-gray-500 mb-2">San Benito | Metrocentro San Salvador | Plaza Mundo Apopa</p>
            <div className="pt-2">
              <Link href="/admin/login" className="text-xs text-gray-400 hover:text-red-600 transition-colors underline">
                Acceso para Colaboradores (Staff)
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 mt-8 pt-6 text-center text-xs text-gray-400">
          © 2026 NizeStore El Salvador - MVP Universitario de Inteligencia de Negocios.
        </div>
      </div>
    </footer>
  );
}
