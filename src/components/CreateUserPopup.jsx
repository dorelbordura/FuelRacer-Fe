import React, { useState } from "react";
import {isAddress} from 'ethers';

const CreateUserPopup = ({ onClose, onConfirm }) => {
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");

  const handleConfirm = () => {
    if (!isAddress(address.trim())) {
      setError("Invalid wallet address");
      return;
    }
    setError("");
    onConfirm(address.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-gradient-to-b from-black to-gray-900 text-white rounded-2xl shadow-[0_0_25px_rgba(255,0,0,0.6)] w-[500px] p-10 relative border border-red-700">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-red-500 text-lg"
          style={{ cursor: "pointer" }}
        >
          ✕
        </button>

        {/* Title */}
        <h2 className="text-2xl font-extrabold text-center mb-8 text-red-500 tracking-wide drop-shadow-lg">
          Enter Wallet Address
        </h2>

        {/* Input */}
        <input
          type="text"
          placeholder="0x..."
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full px-4 py-3 mb-6 rounded-xl bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-red-500 placeholder-gray-500"
        />

        {error && (
          <p className="text-red-500 text-sm mb-3">{error}</p>
        )}

        {/* Confirm button */}
        <button
          onClick={handleConfirm}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition shadow-[0_0_15px_rgba(255,0,0,0.6)]"
        >
          Confirm
        </button>
      </div>
    </div>
  );
};

export default CreateUserPopup;
