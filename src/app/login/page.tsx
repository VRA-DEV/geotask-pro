"use client";

import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("geotask_user");
    if (saved) router.push("/");
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
        setError(data.error || "Credenciais inválidas");
      }
    } catch {
      setError("Erro de conexão com o servidor");
    } finally {
      setLoading(false);
    }
  };

  const inputBase: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px 12px 44px",
    background: "#f8fafc",
    border: "1.5px solid #e2e8f0",
    borderRadius: "12px",
    color: "#1e293b",
    fontSize: "15px",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "FCFFF0",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle background blobs */}
      <div
        style={{
          position: "absolute",
          width: 480,
          height: 480,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(152,175,59,0.18) 0%, transparent 70%)",
          top: -120,
          right: -80,
          filter: "blur(48px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 360,
          height: 360,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(152,175,59,0.12) 0%, transparent 70%)",
          bottom: -60,
          left: -60,
          filter: "blur(48px)",
          pointerEvents: "none",
        }}
      />

      {/* Card */}
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          padding: "44px 40px 36px",
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(16px)",
          borderRadius: 28,
          border: "1px solid rgba(152,175,59,0.18)",
          boxShadow:
            "0 4px 6px -1px rgba(0,0,0,0.05), 0 20px 60px -12px rgba(0,0,0,0.12)",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Logo + heading */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <Image
              src="/logo.png"
              alt="Geogis Logo"
              width={160}
              height={52}
              style={{ objectFit: "contain" }}
              priority
            />
          </div>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: "#1e293b",
              margin: "0 0 6px",
              letterSpacing: "-0.02em",
            }}
          >
            Bem-vindo ao GeoTask Pro
          </h1>
          <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>
            Faça login para acessar o painel
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 18 }}
        >
          {/* Email */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: "#475569",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 6,
              }}
            >
              Email
            </label>
            <div style={{ position: "relative" }}>
              <Mail
                size={17}
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94a3b8",
                  pointerEvents: "none",
                }}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                style={inputBase}
                onFocus={(e) => {
                  e.target.style.borderColor = "#98af3b";
                  e.target.style.boxShadow = "0 0 0 3px rgba(152,175,59,0.15)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e2e8f0";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: "#475569",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 6,
              }}
            >
              Senha
            </label>
            <div style={{ position: "relative" }}>
              <Lock
                size={17}
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94a3b8",
                  pointerEvents: "none",
                }}
              />
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ ...inputBase, paddingRight: 44 }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#98af3b";
                  e.target.style.boxShadow = "0 0 0 3px rgba(152,175,59,0.15)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e2e8f0";
                  e.target.style.boxShadow = "none";
                }}
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                style={{
                  position: "absolute",
                  right: 13,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 2,
                  color: "#94a3b8",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "11px 14px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 10,
                color: "#dc2626",
                fontSize: 13,
              }}
            >
              <AlertCircle size={15} />
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              background: loading ? "#b8cc6b" : "#98af3b",
              color: "white",
              border: "none",
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              marginTop: 4,
              boxShadow: "0 4px 14px rgba(152,175,59,0.35)",
              letterSpacing: "-0.01em",
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = "#8a9f32";
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow =
                  "0 6px 20px rgba(152,175,59,0.45)";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.background = "#98af3b";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 4px 14px rgba(152,175,59,0.35)";
              }
            }}
          >
            {loading ? (
              <Loader2
                size={20}
                style={{ animation: "spin 1s linear infinite" }}
              />
            ) : (
              <>
                Entrar
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <p
          style={{
            textAlign: "center",
            color: "#94a3b8",
            fontSize: 12,
            marginTop: 28,
            marginBottom: 0,
          }}
        >
          © {new Date().getFullYear()} Geogis. Todos os direitos reservados.
        </p>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        input::placeholder { color: #b0bec5; }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
