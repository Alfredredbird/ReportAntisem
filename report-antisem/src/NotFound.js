import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: "#0b1220",
        color: "#fff",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <h1
        style={{
          fontSize: "6rem",
          margin: 0,
          color: "#e8c56d",
        }}
      >
        404
      </h1>

      <h2>Page Not Found</h2>

      <p
        style={{
          maxWidth: "500px",
          opacity: 0.8,
          marginBottom: "2rem",
        }}
      >
        The page you're looking for doesn't exist or may have been moved.
      </p>

      <button
        onClick={() => navigate("/")}
        style={{
          background: "#e8c56d",
          color: "#000",
          border: "none",
          padding: "12px 24px",
          borderRadius: "8px",
          fontWeight: "bold",
          cursor: "pointer",
        }}
      >
        Return Home
      </button>
    </div>
  );
}
