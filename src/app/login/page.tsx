"use client";

import { AlertCircle, ArrowRight, Loader2, Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [vibrant, setVibrant] = useState(0);

  useEffect(() => {
    // Check if already logged in
    const saved = localStorage.getItem("geotask_user");
    if (saved) {
      router.push("/");
    }

    // Simple animation effect
    const interval = setInterval(() => {
      setVibrant((v) => (v + 1) % 360);
    }, 100);
    return () => clearInterval(interval);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("geotask_user", JSON.stringify(data));
        router.push("/");
      } else {
        setError(data.error || "Erro ao realizar login");
      }
    } catch (err) {
      console.error(err);
      setError("Erro de conexão com o servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#030712",
        fontFamily: "system-ui, -apple-system, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Dynamic Background Elements */}
      <div
        style={{
          position: "absolute",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background: `radial-gradient(circle, hsla(${vibrant}, 70%, 50%, 0.15) 0%, transparent 70%)`,
          top: "-100px",
          right: "-100px",
          filter: "blur(60px)",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(152, 175, 59, 0.1) 0%, transparent 70%)",
          bottom: "-50px",
          left: "-50px",
          filter: "blur(50px)",
          zIndex: 0,
        }}
      />

      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          padding: "40px",
          background: "rgba(17, 24, 39, 0.8)",
          backdropFilter: "blur(12px)",
          borderRadius: "24px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          zIndex: 1,
          position: "relative",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              background: "#98af3b",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              boxShadow: "0 10px 20px rgba(152, 175, 59, 0.3)",
            }}
          >
            <Lock size={32} color="white" />
          </div>
          <h1
            style={{
              fontSize: "28px",
              fontWeight: 800,
              color: "white",
              margin: "0 0 8px",
              letterSpacing: "-0.025em",
            }}
          >
            GeoTask Pro
          </h1>
          <p style={{ color: "#9ca3af", fontSize: "14px", margin: 0 }}>
            Painel de Controle e Gestão
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "20px" }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "#9ca3af",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginLeft: "4px",
              }}
            >
              Email
            </label>
            <div style={{ position: "relative" }}>
              <Mail
                size={18}
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#6b7280",
                }}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                style={{
                  width: "100%",
                  padding: "12px 14px 12px 42px",
                  background: "rgba(31, 41, 55, 0.5)",
                  border: "1px solid rgba(75, 85, 99, 0.3)",
                  borderRadius: "12px",
                  color: "white",
                  fontSize: "15px",
                  outline: "none",
                  transition: "all 0.2s",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#98af3b";
                  e.target.style.background = "rgba(31, 41, 55, 0.8)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(75, 85, 99, 0.3)";
                  e.target.style.background = "rgba(31, 41, 55, 0.5)";
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "#9ca3af",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginLeft: "4px",
              }}
            >
              Senha
            </label>
            <div style={{ position: "relative" }}>
              <Lock
                size={18}
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#6b7280",
                }}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: "100%",
                  padding: "12px 14px 12px 42px",
                  background: "rgba(31, 41, 55, 0.5)",
                  border: "1px solid rgba(75, 85, 99, 0.3)",
                  borderRadius: "12px",
                  color: "white",
                  fontSize: "15px",
                  outline: "none",
                  transition: "all 0.2s",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#98af3b";
                  e.target.style.background = "rgba(31, 41, 55, 0.8)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(75, 85, 99, 0.3)";
                  e.target.style.background = "rgba(31, 41, 55, 0.5)";
                }}
              />
            </div>
          </div>

          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                borderRadius: "10px",
                color: "#f87171",
                fontSize: "13px",
              }}
            >
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              background: "#98af3b",
              color: "white",
              border: "none",
              borderRadius: "12px",
              fontSize: "16px",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              marginTop: "8px",
              boxShadow: "0 10px 20px rgba(152, 175, 59, 0.2)",
            }}
            onMouseEnter={(e) => {
              if (!loading)
                e.currentTarget.style.transform = "translateY(-1px)";
              if (!loading) e.currentTarget.style.background = "#a9c245";
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.transform = "translateY(0)";
              if (!loading) e.currentTarget.style.background = "#98af3b";
            }}
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                Entrar
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: "32px", textAlign: "center" }}>
          <p style={{ color: "#4b5563", fontSize: "12px" }}>
            © {new Date().getFullYear()} Geogis. Todos os direitos reservados.
          </p>
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
