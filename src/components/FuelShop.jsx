import React, { useState } from "react";
import { Contract} from "ethers";
import { useGame } from "../store";

const TOKEN_ADDRESS = process.env.REACT_APP_FUEL_TOKEN_ADDRESS;

const fuelOptions = [
  { id: 1, fuel: 1, price: 250_000, label: "1 Fuel", bonus: "0%" },
  { id: 2, fuel: 5, price: 1_000_000, label: "5 Fuel", bonus: "+20%" },
  { id: 3, fuel: 20, price: 3_500_000, label: "20 Fuel", bonus: "+30%" },
];

const FuelPopup = ({ onClose, rewardsWallet, buyFuel, showNotification }) => {
    const [loading, setLoading] = useState(false);
    const {credentials, setFuel} = useGame();
    const [selected, setSelected] = useState(2);

    const handleBuy = async (option) => {
        try {
            setLoading(true);
            const {signer} = credentials || {};

            const token = new Contract(
                TOKEN_ADDRESS,
                ["function transfer(address to, uint256 value) public returns (bool)"],
                signer
            );

            // transfer tokens to rewards wallet
            let tx = await token.transfer(rewardsWallet, option.cost);
            let receipt = await tx.wait();

            // notify backend for validation + burn + fuel credit
            const res = await buyFuel(option.fuel, receipt.hash);

            if (res.fuel) {
                setFuel(res.fuel)
                showNotification({message: `You bought ${option.fuel} Fuel!` })
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
            <div className="bg-gradient-to-b from-black to-gray-900 text-white rounded-2xl shadow-[0_0_25px_rgba(255,0,0,0.6)] w-[420px] p-6 relative border border-red-700">
                
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-lg"
                    style={{cursor: 'pointer'}}
                >
                    ✕
                </button>

                {/* Title */}
                <h2 className="text-3xl font-extrabold text-center mb-6 text-red-500 tracking-wide drop-shadow-lg">
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
                    className="mt-6 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition shadow-[0_0_15px_rgba(255,0,0,0.6)]"
                >
                    Buy
                </button>
            </div>
        </div>
    );
};

export default FuelPopup;
