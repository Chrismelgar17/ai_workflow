import React from "react";

// Simple page to embed Swagger UI from the backend so it works reliably on Vercel
// Uses NEXT_PUBLIC_API_URL to point to the deployed backend
const DocsPage = () => {
  const base = process.env.NEXT_PUBLIC_API_URL || "";
  const src = base ? `${base}/api/docs` : "/api/docs";

  return (
    <div style={{ height: "100%", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e5e7eb" }}>
        <h1 style={{ fontSize: 18, fontWeight: 600 }}>API Docs</h1>
        <p style={{ color: "#6b7280", fontSize: 14 }}>
          If the embedded view has issues, open in a new tab: {" "}
          <a href={src} target="_blank" rel="noreferrer" style={{ color: "#2563eb" }}>
            {src}
          </a>
        </p>
      </div>
      <iframe
        title="Swagger UI"
        src={src}
        style={{ border: 0, width: "100%", flex: 1, minHeight: 0 }}
      />
    </div>
  );
};

export default DocsPage;
