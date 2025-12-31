import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginButton } from "@/components/auth/LoginButton";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          {/* Logo */}
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center mb-6">
              <span className="text-white font-bold text-2xl">AI</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">AIGram</h1>
            <p className="mt-2 text-gray-600">
              Gestiona tu arte AI para Instagram
            </p>
          </div>

          {/* Login form */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  Bienvenido
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Inicia sesión para continuar
                </p>
              </div>

              <LoginButton />

              <p className="text-xs text-center text-gray-400">
                Al continuar, aceptas nuestros{" "}
                <a href="#" className="text-primary hover:underline">
                  Términos de servicio
                </a>{" "}
                y{" "}
                <a href="#" className="text-primary hover:underline">
                  Política de privacidad
                </a>
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4">
              <div className="text-2xl mb-2">📤</div>
              <p className="text-xs text-gray-500">Sube tus imágenes AI</p>
            </div>
            <div className="p-4">
              <div className="text-2xl mb-2">✂️</div>
              <p className="text-xs text-gray-500">Recorta para Instagram</p>
            </div>
            <div className="p-4">
              <div className="text-2xl mb-2">🏷️</div>
              <p className="text-xs text-gray-500">Organiza con tags</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Decorative (hidden on mobile) */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary to-secondary items-center justify-center p-8">
        <div className="max-w-lg text-center text-white">
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
              <div
                key={i}
                className="aspect-square bg-white/10 rounded-lg backdrop-blur-sm"
              />
            ))}
          </div>
          <h2 className="text-2xl font-bold mb-4">
            Tu galería de arte AI perfecta
          </h2>
          <p className="text-white/80">
            Organiza, edita y prepara tus imágenes generadas con IA para
            publicar en Instagram con el formato perfecto.
          </p>
        </div>
      </div>
    </div>
  );
}
