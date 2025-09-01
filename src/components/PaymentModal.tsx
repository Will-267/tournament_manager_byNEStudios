
import { useState } from "react";
import { toast } from "sonner";

interface PaymentModalProps {
  tournamentId: string;
  paymentType: "participant_fee" | "spectator_fee";
  amount: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function PaymentModal({ tournamentId, paymentType, amount, onClose, onSuccess }: PaymentModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardholderName, setCardholderName] = useState("");

  const platformFee = Math.round(amount * 0.1 * 100) / 100;
  const hostAmount = amount - platformFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      // Simulate payment processing (in real app, use Stripe or similar)
      await new Promise(resolve => setTimeout(resolve, 2000));
      // Register user after payment
      const role = paymentType === "participant_fee" ? "participant" : "spectator";
      const res = await fetch(`/api/tournaments/${tournamentId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, paid: true }),
      });
      if (!res.ok) throw new Error("Payment failed");
      toast.success("Payment successful!");
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Payment failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Complete Payment</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Payment Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">
                {paymentType === "participant_fee" ? "Participant Fee" : "Spectator Fee"}
              </span>
              <span className="font-semibold">${amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-gray-500">
              <span>Platform Fee (10%)</span>
              <span>${platformFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-gray-500">
              <span>Host Receives</span>
              <span>${hostAmount.toFixed(2)}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cardholder Name
              </label>
              <input
                type="text"
                required
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Card Number
              </label>
              <input
                type="text"
                required
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1234 5678 9012 3456"
                maxLength={19}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expiry Date
                </label>
                <input
                  type="text"
                  required
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="MM/YY"
                  maxLength={5}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CVV
                </label>
                <input
                  type="text"
                  required
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/[^0-9]/g, '').substring(0, 4))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="123"
                  maxLength={4}
                />
              </div>
            </div>

            <div className="text-xs text-gray-500 mt-4">
              🔒 Your payment information is secure and encrypted. This is a demo payment form.
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50"
              >
                {isProcessing ? "Processing..." : `Pay $${amount.toFixed(2)}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
