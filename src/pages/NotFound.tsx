import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div
      style={{
        minHeight: "100svh",
        background: "#0a0a0a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        fontFamily: "'DM Sans', sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Grid texture */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      {/* Vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, transparent 30%, #0a0a0a 80%)",
        }}
      />

      {/* Card */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 420,
          background: "#111",
          border: "0.5px solid #222",
          borderRadius: 16,
          padding: 40,
          textAlign: "center",
        }}
      >
        {/* Corner accents */}
        <span
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            width: 12,
            height: 12,
            borderTop: "1px solid rgba(159,0,0,0.3)",
            borderLeft: "1px solid rgba(159,0,0,0.3)",
            borderRadius: "2px 0 0 0",
          }}
        />
        <span
          style={{
            position: "absolute",
            bottom: 10,
            right: 10,
            width: 12,
            height: 12,
            borderBottom: "1px solid rgba(159,0,0,0.3)",
            borderRight: "1px solid rgba(159,0,0,0.3)",
            borderRadius: "0 0 2px 0",
          }}
        />

        {/* Logo */}
        <div
          style={{
            width: 52,
            height: 52,
            margin: "0 auto 24px",
            borderRadius: 12,
            background: "#1a1a1a",
            border: "0.5px solid #2a2a2a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src="/favicon.png"
            alt="icon"
            style={{ width: 32, height: 32, objectFit: "contain", opacity: 0.85 }}
          />
        </div>

        {/* Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            borderRadius: 6,
            background: "rgba(159,0,0,0.1)",
            border: "0.5px solid rgba(220,38,38,0.25)",
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#dc2626",
            marginBottom: 20,
          }}
        >
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "#dc2626",
              animation: "pulse 2s ease-in-out infinite",
            }}
          />
          Error 404
        </div>

        {/* Big number */}
        <div
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 96,
            lineHeight: 1,
            letterSpacing: -4,
            color: "#9f0000",
            margin: "0 0 4px",
            userSelect: "none",
          }}
        >
          404
        </div>

        <p
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 20,
            color: "#e8e8e8",
            margin: "0 0 8px",
            fontWeight: 400,
          }}
        >
          Page not found
        </p>
        <p
          style={{
            fontSize: 13,
            color: "#555",
            lineHeight: 1.6,
            margin: "0 0 20px",
            fontWeight: 300,
          }}
        >
          The page you're looking for doesn't exist or may have been moved.
        </p>

        {/* Path pill */}
        <div
          style={{
            display: "inline-block",
            fontFamily: "'DM Mono', monospace",
            fontSize: 11,
            color: "#444",
            background: "#0d0d0d",
            border: "0.5px solid #222",
            borderRadius: 6,
            padding: "6px 12px",
            marginBottom: 28,
            wordBreak: "break-all",
          }}
        >
          {location.pathname}
        </div>

        <hr
          style={{
            height: "0.5px",
            background: "#1e1e1e",
            border: "none",
            margin: "0 0 24px",
          }}
        />

        {/* Actions */}
        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <a
            href="/"
            style={{
              padding: "10px 22px",
              background: "#9f0000",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            ↖ Go home
          </a>
          <button
            onClick={() => history.back()}
            style={{
              padding: "10px 20px",
              background: "transparent",
              color: "#555",
              border: "0.5px solid #2a2a2a",
              borderRadius: 8,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Go back
          </button>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap');
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
};

export default NotFound;
