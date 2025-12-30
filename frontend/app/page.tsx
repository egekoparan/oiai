import Background from "@/components/Background";
import Logo from "@/components/Logo";
import LoginForm from "@/components/LoginForm";

export default function Home() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center p-4 bg-transparent overflow-hidden">
      <Background />

      {/* Content Container */}
      <div className="relative z-10 w-full max-w-lg flex flex-col items-center">
        <Logo />
        <LoginForm />

        {/* Footer / Copyright */}
        <div className="mt-8 text-cyan-500/30 text-xs tracking-widest uppercase font-mono">
          Orion Agentic System v.2.0
        </div>
      </div>
    </main>
  );
}
