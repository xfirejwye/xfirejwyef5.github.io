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
    <div className="flex min-h-screen items-center justify-center p-8" style={{ background: "#0f0f0f" }}>
      <div className="w-full max-w-md rounded-2xl border p-10 text-center" style={{ background: "#1a1a1a", borderColor: "#2e2e2e" }}>

        {/* Icon */}
     <div className="mx-auto mb-6 flex items-center justify-center">
  <img
    src="/favicon.png"
    alt="icon"
    style={{ width: 65, height: 65, objectFit: "contain" }}
  />
</div>
        {/* Badge */}
        <span className="mb-4 inline-block rounded-md px-2.5 py-1 text-xs font-medium uppercase tracking-wide" style={{ color: "#ef4444", background: "rgba(239,68,68,0.12)", border: "0.5px solid rgba(239,68,68,0.3)" }}>
          Error 404
        </span>

        {/* Heading */}
        <h1 className="mb-1 font-medium leading-none" style={{ fontSize: 80, letterSpacing: -2, color: "#ef4444" }}>404</h1>
        <p className="mb-2 text-lg font-medium" style={{ color: "#f5f5f5" }}>Page not found</p>
        <p className="mb-4 text-sm" style={{ color: "#888" }}>
          The page you're looking for doesn't exist or may have been moved.
        </p>

        {/* Path pill */}
        <div className="mb-6 inline-block rounded-md px-3 py-1 font-mono text-xs" style={{ background: "#111", border: "0.5px solid #2e2e2e", color: "#666" }}>
          {location.pathname}
        </div>

        <hr className="mb-6" style={{ borderColor: "#2e2e2e" }} />

        {/* Actions */}
        <div className="flex flex-wrap justify-center gap-2.5">
          <a href="/" className="rounded-lg px-6 py-2.5 text-sm font-medium transition-opacity hover:opacity-85" style={{ background: "#ef4444", color: "#fff" }}>
            Go home
          </a>
          <button onClick={() => history.back()} className="rounded-lg px-6 py-2.5 text-sm transition-colors" style={{ background: "transparent", color: "#888", border: "0.5px solid #2e2e2e" }}>
            Go back
          </button>
        </div>

      </div>
    </div>
  );
};

export default NotFound;
