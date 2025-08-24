import React from "react";

export default function Notification({ message, type = "info" }) {
  const base = "px-6 py-3 rounded-xl shadow-lg text-center font-medium";
  const styles = {
    info: "bg-blue-600 text-white",
    success: "bg-green-600 text-white",
    error: "bg-red-600 text-white",
    warning: "bg-yellow-600 text-black"
  };

  return (
    <div className={`absolute top-16 left-1/2 transform -translate-x-1/2 ${base} ${styles[type]}`} style={{zIndex: '9'}}>
      {message}
    </div>
  );
}
