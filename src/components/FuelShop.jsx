import React, { useState } from "react";
import { Contract, JsonRpcProvider, parseUnits } from "ethers";
import { useGame } from "../store";
import { ERC20_ABI } from "../utils/erc20Abi";

const TOKEN_ADDRESS = process.env.REACT_APP_FUEL_TOKEN_ADDRESS;
const FUELSHOP_ADDRESS = process.env.REACT_APP_FUEL_SHOP_CONTRACT;

const fuelOptions = [
    { id: 1, fuel: 1, price: 2, label: "1 Fuel", bonus: "0%", cost: parseUnits("2", 18) },
    { id: 2, fuel: 5, price: 1_000_000, label: "5 Fuel", bonus: "+20%", cost: parseUnits("1000000", 18) },
    { id: 3, fuel: 20, price: 3_500_000, label: "20 Fuel", bonus: "+30%", cost: parseUnits("3500000", 18) },
];

const FUELSHOP_ABI = [
  "function buyFuel(uint256 amount) external",
  "event FuelPurchased(address indexed buyer, uint256 amount)"
];

const FuelPopup = ({ onClose, buyFuel, showNotification, signer }) => {
    const [loading, setLoading] = useState(false);
    const {wallet, setFuel} = useGame();
    const [selected, setSelected] = useState(2);

    const handleBuy = async (option) => {
        try {
            setLoading(true);

            const rpcProvider = new JsonRpcProvider("https://api.avax.network/ext/bc/C/rpc");
            const tokenRead = new Contract(TOKEN_ADDRESS, ERC20_ABI, rpcProvider);

            const tokenWrite = new Contract(TOKEN_ADDRESS, ERC20_ABI, signer);
            const fuelShop = new Contract(FUELSHOP_ADDRESS, FUELSHOP_ABI, signer);

            // --- Check balance first
            const balance = await tokenRead.balanceOf(wallet);

            if (balance < option.cost) {
                showNotification({ message: "Not enough $FUEL tokens", type: "warning" });
                return;
            }

            const approveTx = await tokenWrite.approve(FUELSHOP_ADDRESS, option.cost);
            await approveTx.wait();

             // --- Buy fuel
            const buyTx = await fuelShop.buyFuel(option.cost);
            const receipt = await buyTx.wait();

            // Notify backend
            const res = await buyFuel(option.fuel, receipt.hash);

            console.log(res);

            if (res && res.fuel) {
                setFuel(res.fuel);
                showNotification({ message: `You bought ${option.fuel} Fuel!` });
            }
        } catch (err) {
            console.error(err);
            showNotification({message: 'Transaction failed' })
        } finally {
            setLoading(false);
        }
    };

    const onBuyClick = () => {
        const option = fuelOptions.find((o) => o.id === selected);
        if (option) {
            handleBuy(option);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-gradient-to-b from-black to-gray-900 text-white rounded-2xl shadow-[0_0_25px_rgba(255,0,0,0.6)] w-[620px] p-20 relative border border-red-700">
                
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 text-gray-400 hover:text-red-500 text-lg"
                    style={{cursor: 'pointer'}}
                >
                    ✕
                </button>

                {/* Title */}
                <h2 className="text-3xl font-extrabold text-center mb-20 text-red-500 tracking-wide drop-shadow-lg">
                    Gas Station
                </h2>

                {/* Options */}
                <div className="space-y-4">
                    {fuelOptions.map((opt) => (
                        <div
                            key={opt.id}
                            className={`cursor-pointer border-2 rounded-xl p-5 transition transform
                                ${selected === opt.id
                                ? "border-red-500 bg-red-600/20 scale-105 shadow-[0_0_15px_rgba(255,0,0,0.7)]"
                                : "border-gray-700 bg-gray-800 hover:border-red-500 hover:scale-102"}`}
                            onClick={() => setSelected(opt.id)}
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="text-xl font-bold">{opt.label}</div>
                                    <div className="text-sm text-gray-400">
                                        {opt.price.toLocaleString()} $FUEL
                                    </div>
                                </div>
                                {opt.bonus !== "0%" && (
                                    <div className="text-green-400 font-extrabold text-lg">
                                        {opt.bonus}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Buy Button */}
                <button
                    onClick={onBuyClick}
                    disabled={loading}
                    className={`mt-6 w-full font-bold py-3 rounded-xl transition shadow-[0_0_15px_rgba(255,0,0,0.6)] 
                        ${loading ? "bg-gray-700 text-gray-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700 text-white"}`}
                    style={{cursor: loading ? 'not-allowed' : 'pointer'}}
                >
                    {loading ? (
                        <div className="flex items-center justify-center space-x-2">
                            <svg
                                className="animate-spin h-5 w-5 text-red-500"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                ></circle>
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                ></path>
                            </svg>
                            <span>Processing...</span>
                        </div>
                    ) : (
                        "Buy"
                    )}
                </button>
            </div>
        </div>
    );
};

export default FuelPopup;
