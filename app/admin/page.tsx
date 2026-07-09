"use client";

import { useState, useEffect } from "react";

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        console.log("🔍 User data:", data);
        
        setUser(data.user);
        setIsAdmin(data.user?.isAdmin || false);
        setLoading(false);
        
        // SHOW what's happening but DON'T redirect
        if (data.user && data.user.isAdmin) {
          console.log("✅ Admin confirmed!");
        } else if (data.user) {
          console.log("❌ User is NOT admin");
        } else {
          console.log("❌ No user logged in");
        }
      } catch (error) {
        console.error("Error:", error);
        setLoading(false);
      }
    }
    
    check();
  }, []);

  if (loading) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        backgroundColor: "#0B0D12",
        color: "white"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>⏳</div>
          <p style={{ color: "#7A8194" }}>Checking admin status...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      flexDirection: "column",
      alignItems: "center", 
      justifyContent: "center",
      backgroundColor: "#0B0D12",
      color: "white",
      padding: "20px"
    }}>
      <div style={{ 
        backgroundColor: "#12151C",
        border: "1px solid #20242F",
        borderRadius: "12px",
        padding: "40px",
        maxWidth: "500px",
        width: "100%",
        textAlign: "center"
      }}>
        <h1 style={{ fontSize: "28px", marginBottom: "16px" }}>
          🗄️ Admin Panel
        </h1>
        
        {/* Show user info */}
        {user && (
          <div style={{ 
            backgroundColor: "#0B0D12", 
            padding: "12px", 
            borderRadius: "8px",
            marginBottom: "20px",
            textAlign: "left",
            fontSize: "14px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
              <span style={{ color: "#7A8194" }}>Email:</span>
              <span style={{ color: "white" }}>{user.email}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
              <span style={{ color: "#7A8194" }}>Display Name:</span>
              <span style={{ color: "white" }}>{user.displayName}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
              <span style={{ color: "#7A8194" }}>isAdmin:</span>
              <span style={{ color: isAdmin ? "#3DFFB2" : "#FF4D6A" }}>
                {isAdmin ? "✅ true" : "❌ false"}
              </span>
            </div>
          </div>
        )}
        
        {!user && (
          <div style={{ 
            backgroundColor: "#0B0D12", 
            padding: "12px", 
            borderRadius: "8px",
            marginBottom: "20px",
            color: "#FF4D6A"
          }}>
            ⚠️ You are not logged in!
          </div>
        )}
        
        {/* Show appropriate actions */}
        {isAdmin ? (
          <>
            <p style={{ color: "#3DFFB2", marginBottom: "24px" }}>
              ✅ You have admin access!
            </p>
            
            <button
              onClick={() => window.open("http://localhost:5555", "_blank")}
              style={{
                padding: "14px 24px",
                backgroundColor: "#3DFFB2",
                color: "#0B0D12",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "16px",
                width: "100%",
                marginBottom: "12px"
              }}
            >
              🚀 Open Prisma Studio
            </button>
            
            <button
              onClick={() => window.location.href = "/dashboard"}
              style={{
                padding: "12px 24px",
                backgroundColor: "transparent",
                color: "#7A8194",
                border: "1px solid #20242F",
                borderRadius: "8px",
                cursor: "pointer",
                width: "100%"
              }}
            >
              Go to Dashboard
            </button>
          </>
        ) : (
          <>
            <p style={{ color: "#FF4D6A", marginBottom: "24px" }}>
              ⚠️ You do not have admin access
            </p>
            
            <button
              onClick={() => window.location.href = "/login"}
              style={{
                padding: "14px 24px",
                backgroundColor: "#3DFFB2",
                color: "#0B0D12",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "16px",
                width: "100%"
              }}
            >
              Go to Login
            </button>
          </>
        )}
        
        <div style={{ marginTop: "20px", fontSize: "12px", color: "#7A8194" }}>
          💡 Prisma Studio: http://localhost:5555
        </div>
      </div>
    </div>
  );
}